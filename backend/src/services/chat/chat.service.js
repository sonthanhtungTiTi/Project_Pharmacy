const axios = require('axios')
const mongoose = require('mongoose')

// const ChatConversation = require('../../models/chatConversation.model')
// const ChatMessage = require('../../models/chatMessage.model')
const Product = require('../../models/product.model')
const Order = require('../../models/order.model')
const User = require('../../models/user.model')

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b'
const OLLAMA_QUERY_API_KEY = process.env.OLLAMA_QUERY_API_KEY || ''
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 30000)

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const MAX_PIPELINE_STAGES = 20

const WRITE_STAGES = new Set(['$out', '$merge'])
const FORBIDDEN_OPERATORS = new Set(['$where', '$function', '$accumulator'])
const READ_OPERATIONS = new Set(['find', 'aggregate', 'countDocuments'])

const SUPPORT_ROLES = new Set(['admin', 'manager', 'pharmacist', 'sales_staff'])

const INTENTS = {
    CHAT: 'CHAT',
    GENERAL_FAQ: 'GENERAL_FAQ',
    FIND_PRODUCT: 'FIND_PRODUCT',
    QUERY_PRODUCT: 'QUERY_PRODUCT',
    CALL_HUMAN: 'CALL_HUMAN',
    SOCIAL_CHAT: 'SOCIAL_CHAT',
    CONSULTATION: 'CONSULTATION',
}

const SOCIAL_HINT_REGEX = /\b(chao|xin chao|hello|hi|alo|cam on|thank|thanks|tam biet|bye|chuc ngu ngon)\b/i
const HUMAN_HINT_REGEX = /\b(nhan\s?vien|nguoi\s?that|gap\s?tu\s?van\s?vien|goi\s?dien)\b/i
const PRODUCT_HINT_REGEX = /\b(thuoc|san\s?pham|tu\s?van|trieu\s?chung|dau|ho|sot|ngua|viem|tieu\s?chay|buon\s?non|chong\s?mat)\b/i

const SYMPTOM_KEYWORDS = [
    'dau hong',
    'nghet mui',
    'so mui',
    'kho tho',
    'dau bung',
    'dau dau',
    'dau lung',
    'dau rang',
    'dau co',
    'dau khop',
    'dau vai',
    'dau nguc',
    'mat ngu',
    'met moi',
    'chong mat',
    'buon non',
    'non',
    'tieu chay',
    'tao bon',
    'day bung',
    'khong tieu',
    'ho',
    'sot',
    'cam',
    'cum',
    'di ung',
    'ngua',
    'man do',
    'noi me day',
    'viem',
    'viem hong',
    'viem mui',
    'viem xoang',
]

const QUERY_STOPWORDS = new Set([
    'toi',
    'minh',
    'ban',
    'xin',
    'nho',
    'giup',
    'tu',
    'van',
    'thuoc',
    'san',
    'pham',
    'can',
    'tim',
    'kiem',
    'tra',
    'cuu',
    'dang',
    'bi',
    'cho',
    'voi',
])

const PRODUCT_DETAIL_FIELDS =
    '_id medicineCode productName medicineName categoryName price usageSummary usage description targetUsers mainIngredients activeIngredient ingredients brand images updatedAt'

class ChatServiceError extends Error {
    constructor(message, statusCode = 400) {
        super(message)
        this.statusCode = statusCode
    }
}

const ensureObjectId = (value, fieldName) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new ChatServiceError(`${fieldName} is invalid`, 400)
    }
}

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeText = (value = '') =>
    String(value || '')
        .replace(/[đĐ]/g, (char) => (char === 'Đ' ? 'D' : 'd'))
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

const normalizeImageField = (value) => {
    if (!value) {
        return ''
    }

    if (Array.isArray(value)) {
        const first = value.find((item) => typeof item === 'string' && item.trim())
        return first ? String(first).trim() : ''
    }

    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) {
            return ''
        }

        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed)
                return normalizeImageField(parsed)
            } catch {
                // Ignore parse error and continue fallback parsing.
            }
        }

        if (trimmed.includes(',')) {
            const first = trimmed
                .split(',')
                .map((item) => item.trim())
                .find(Boolean)
            return first || ''
        }

        return trimmed
    }

    return ''
}

const pickRandomItems = (items, count) => {
    if (!Array.isArray(items) || items.length === 0 || count <= 0) {
        return []
    }

    if (items.length <= count) {
        return items
    }

    const shuffled = [...items]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = shuffled[i]
        shuffled[i] = shuffled[j]
        shuffled[j] = tmp
    }

    return shuffled.slice(0, count)
}

const cleanJsonString = (text = '') => {
    let value = String(text || '').trim()
    if (!value) {
        return '{}'
    }

    value = value
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .trim()

    const start = value.indexOf('{')
    const end = value.lastIndexOf('}')
    if (start >= 0 && end > start) {
        value = value.slice(start, end + 1)
    }

    value = value.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
    value = value.replace(/'/g, '"')
    value = value.replace(/,\s*([}\]])/g, '$1')

    const openCurly = (value.match(/{/g) || []).length
    const closeCurly = (value.match(/}/g) || []).length
    if (openCurly > closeCurly) {
        value += '}'.repeat(openCurly - closeCurly)
    }

    const openSquare = (value.match(/\[/g) || []).length
    const closeSquare = (value.match(/\]/g) || []).length
    if (openSquare > closeSquare) {
        value += ']'.repeat(openSquare - closeSquare)
    }

    return value
}

const parseOllamaJson = (rawText, fallback = {}) => {
    const cleaned = cleanJsonString(rawText)
    try {
        return JSON.parse(cleaned)
    } catch {
        return fallback
    }
}

const toPlainUser = (value) => {
    if (!value || typeof value !== 'object') {
        return null
    }

    const userId = value._id || value.id
    if (!userId) {
        return null
    }

    return {
        id: String(userId),
        fullName: value.fullName || '',
        email: value.email || '',
        phone: value.phone || '',
        role: value.role || '',
    }
}

const serializeConversation = (doc) => ({
    id: String(doc._id),
    sessionId: doc.sessionId,
    status: doc.status,
    clientId: typeof doc.clientId === 'object' ? String(doc.clientId?._id || '') : String(doc.clientId || ''),
    client: toPlainUser(doc.clientId),
    assignedStaffId: typeof doc.assignedStaffId === 'object' ? String(doc.assignedStaffId?._id || '') : doc.assignedStaffId ? String(doc.assignedStaffId) : null,
    assignedStaff: toPlainUser(doc.assignedStaffId),
    lastIntent: doc.lastIntent || '',
    lastAction: doc.lastAction || '',
    lastMessageAt: doc.lastMessageAt,
    unreadForClient: Number(doc.unreadForClient || 0),
    unreadForAdmin: Number(doc.unreadForAdmin || 0),
    metadata: doc.metadata || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
})

const serializeMessage = (doc) => ({
    id: String(doc._id),
    conversationId: String(doc.conversationId),
    senderType: doc.senderType,
    senderId: doc.senderId ? String(doc.senderId) : null,
    senderName: doc.senderName || '',
    content: doc.content,
    intent: doc.intent || '',
    action: doc.action || '',
    meta: doc.meta || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
})

const createSessionId = (clientId) =>
    `conv_${String(clientId)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const callOllama = async ({ prompt, system = '', temperature = 0.2, format } = {}) => {
    const payload = {
        model: OLLAMA_MODEL,
        prompt,
        system,
        stream: false,
        options: {
            temperature,
        },
    }

    if (format !== undefined && format !== null && String(format).trim() !== '') {
        payload.format = format
    }

    const headers = {}
    if (OLLAMA_QUERY_API_KEY) {
        headers.Authorization = `Bearer ${OLLAMA_QUERY_API_KEY}`
    }

    const response = await axios.post(OLLAMA_API_URL, payload, {
        timeout: OLLAMA_TIMEOUT_MS,
        headers,
    })

    return String(response?.data?.response || '').trim()
}

const findOrCreateActiveConversation = async (clientId) => {
    ensureObjectId(clientId, 'clientId')

    // Always return a virtual conversation without database persistence
    const virtualConversation = {
        _id: new mongoose.Types.ObjectId(),
        sessionId: createSessionId(clientId),
        clientId,
        status: 'ai',
        lastIntent: INTENTS.GENERAL_FAQ,
        lastAction: INTENTS.GENERAL_FAQ,
        metadata: {},
        unreadForClient: 0,
        unreadForAdmin: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    return virtualConversation
}

const appendMessage = async ({
    conversationId,
    senderType,
    senderId = null,
    senderName = '',
    content,
    intent = '',
    action = '',
    meta = {},
}) => {
    if (!content || !String(content).trim()) {
        throw new ChatServiceError('Message content is required', 400)
    }

    // Return a virtual message object without saving to the database
    const message = {
        _id: new mongoose.Types.ObjectId(),
        conversationId,
        senderType,
        senderId: senderId && mongoose.Types.ObjectId.isValid(senderId) ? senderId : null,
        senderName: String(senderName || '').trim(),
        content: String(content).trim(),
        intent,
        action,
        meta,
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    return message
}

const getConversationMessages = async (conversationId, limit = 40) => {
    // Return an empty array as we no longer persist messages
    return []
}

const touchConversation = async (conversationId, payload = {}) => {
    // Return a virtual conversation object based on the payload
    return {
        _id: conversationId,
        ...payload,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
    }
}

const getClientConversationSnapshot = async (clientId, { limit = 40 } = {}) => {
    const conversation = await findOrCreateActiveConversation(clientId)
    const messages = [] // No persistent messages

    return {
        conversation: serializeConversation(conversation),
        messages,
    }
}

const getClientMessages = async (clientId, conversationId, { limit = 40 } = {}) => {
    // Return a virtual state as we don't persist
    const conversation = {
        _id: conversationId,
        clientId,
        status: 'ai',
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    return {
        conversation: serializeConversation(conversation),
        messages: [],
    }
}

const requestHumanFromClient = async (clientId, conversationId = null, reason = '') => {
    ensureObjectId(clientId, 'clientId')

    // Always create a new virtual conversation for the request
    const conversation = {
        _id: conversationId || new mongoose.Types.ObjectId(),
        clientId,
        status: 'human_pending',
        lastAction: INTENTS.CALL_HUMAN,
        metadata: {
            lastHumanRequestReason: String(reason || '').trim(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    const systemMessage = await appendMessage({
        conversationId: conversation._id,
        senderType: 'system',
        content: 'Yeu cau ho tro voi nhan vien da duoc ghi nhan. Vui long doi trong giay lat.',
        action: INTENTS.CALL_HUMAN,
        meta: {
            reason: String(reason || '').trim(),
        },
    })

    return {
        conversation: serializeConversation(conversation),
        systemMessage: serializeMessage(systemMessage),
    }
}

const ensureStaffCanAccessConversation = async (staffId, conversationId) => {
    ensureObjectId(staffId, 'staffId')
    ensureObjectId(conversationId, 'conversationId')

    const staff = await User.findById(staffId).select('_id fullName email phone role').lean()
    if (!staff) {
        throw new ChatServiceError('Staff user not found', 404)
    }

    if (!SUPPORT_ROLES.has(staff.role)) {
        throw new ChatServiceError('Only support staff can access this conversation', 403)
    }

    // Return a virtual conversation
    const conversation = {
        _id: conversationId,
        status: 'human',
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    return { staff, conversation }
}

const assignConversationToStaff = async (conversationId, { staffId, staffName = '' }) => {
    const { staff, conversation } = await ensureStaffCanAccessConversation(staffId, conversationId)

    const nextStaffName = String(staffName || staff.fullName || 'Nhan vien').trim()
    const updated = await touchConversation(conversation._id, {
        status: 'human',
        assignedStaffId: staff._id,
        lastAction: INTENTS.CALL_HUMAN,
        unreadForAdmin: 0,
    })

    const systemMessage = await appendMessage({
        conversationId: conversation._id,
        senderType: 'system',
        senderId: staff._id,
        senderName: nextStaffName,
        content: `Nhan vien ${nextStaffName} da tham gia ho tro.`,
        action: INTENTS.CALL_HUMAN,
    })

    return {
        conversation: serializeConversation(updated),
        systemMessage: serializeMessage(systemMessage),
    }
}

const closeConversationByStaff = async (conversationId, staffId) => {
    const { conversation } = await ensureStaffCanAccessConversation(staffId, conversationId)

    const updated = await touchConversation(conversation._id, {
        status: 'closed',
        lastAction: 'CLOSED_BY_STAFF',
        unreadForAdmin: 0,
    })

    const systemMessage = await appendMessage({
        conversationId: conversation._id,
        senderType: 'system',
        senderId: staffId,
        content: 'Cuoc tro chuyen da duoc ket thuc boi nhan vien.',
        action: 'CLOSED_BY_STAFF',
    })

    return {
        conversation: serializeConversation(updated),
        systemMessage: serializeMessage(systemMessage),
    }
}

const listConversationsForAdmin = async ({ status = 'all', page = 1, limit = 20, keyword = '' } = {}) => {
    // Return empty results as we don't persist conversations
    return {
        items: [],
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
        },
    }
}

const getConversationMessagesForAdmin = async (staffId, conversationId, { limit = 80 } = {}) => {
    const { conversation } = await ensureStaffCanAccessConversation(staffId, conversationId)
    const messages = [] // No persistent messages

    return {
        conversation: serializeConversation(conversation),
        messages,
    }
}

const splitImages = (images) =>
    String(images || '')
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)

const cleanImageUrl = (url) => {
    if (!url) return ''

    const marker = 'quality_95/'
    const index = url.indexOf(marker)

    if (index !== -1) {
        return url.substring(index + marker.length)
    }

    return url
}
const toProductCard = (doc) => {
    const id = String(doc._id || doc.id || '')


    const imageList = splitImages(doc?.images || '')
    const cleanedImages = imageList.map((img) => cleanImageUrl(img))


    return {
        id,
        productName: doc.productName || doc.medicineName || 'San pham',
        imageUrl: normalizeImageField(cleanedImages[0]),
        price: Number(doc.price || 0),
        productUrl: `http://localhost:5173/product/${id}`,
    }
}

const extractSymptomKeyword = (text) => {
    const normalized = normalizeText(text)
    if (!normalized) {
        return ''
    }

    const matched = [...SYMPTOM_KEYWORDS]
        .sort((a, b) => b.length - a.length)
        .find((keyword) => normalized.includes(normalizeText(keyword)))
    if (matched) {
        return matched
    }

    const patternMatch = normalized.match(
        /\b(dau\s?[a-z]{2,}|viem\s?[a-z]{2,}|nghet\s?mui|so\s?mui|kho\s?tho|tieu\s?chay|buon\s?non|chong\s?mat|mat\s?ngu|met\s?moi|ho|sot|cam|cum)\b/,
    )
    return patternMatch ? String(patternMatch[0]).trim() : ''
}

const tokenizeQuery = (text) => {
    const normalized = normalizeText(text)
    if (!normalized) {
        return []
    }

    return normalized
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !QUERY_STOPWORDS.has(token))
}

const hasForbiddenOperator = (value) => {
    if (!value || typeof value !== 'object') {
        return false
    }

    if (Array.isArray(value)) {
        return value.some((item) => hasForbiddenOperator(item))
    }

    for (const [key, child] of Object.entries(value)) {
        if (FORBIDDEN_OPERATORS.has(key)) {
            return true
        }
        if (hasForbiddenOperator(child)) {
            return true
        }
    }

    return false
}

const sanitizeSort = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { updatedAt: -1 }
    }

    const safeSort = {}
    for (const [key, rawDirection] of Object.entries(value)) {
        const direction = Number(rawDirection)
        if (!key || Number.isNaN(direction)) {
            continue
        }
        safeSort[key] = direction >= 0 ? 1 : -1
    }

    if (Object.keys(safeSort).length === 0) {
        return { updatedAt: -1 }
    }

    return safeSort
}

const sanitizeProjection = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null
    }

    const projection = {}
    for (const [key, raw] of Object.entries(value)) {
        if (!key || key.startsWith('$')) {
            continue
        }
        projection[key] = Number(raw) === 0 ? 0 : 1
    }

    return Object.keys(projection).length > 0 ? projection : null
}

const normalizeReadOnlyQueryPlan = (rawPlan) => {
    const operation = String(rawPlan?.operation || 'find').trim().toLowerCase()
    if (!READ_OPERATIONS.has(operation)) {
        throw new ChatServiceError('Unsupported query operation from AI', 400)
    }

    if (operation === 'countDocuments') {
        const filter = rawPlan?.filter && typeof rawPlan.filter === 'object' ? rawPlan.filter : {}
        if (hasForbiddenOperator(filter)) {
            throw new ChatServiceError('Forbidden MongoDB operator in AI query', 400)
        }
        return {
            operation,
            filter,
            limit: 1,
        }
    }

    if (operation === 'aggregate') {
        const pipeline = Array.isArray(rawPlan?.pipeline) ? rawPlan.pipeline : []
        if (pipeline.length === 0) {
            throw new ChatServiceError('AI aggregate pipeline is empty', 400)
        }
        if (pipeline.length > MAX_PIPELINE_STAGES) {
            throw new ChatServiceError('AI aggregate pipeline is too large', 400)
        }

        for (const stage of pipeline) {
            if (!stage || typeof stage !== 'object' || Array.isArray(stage)) {
                throw new ChatServiceError('Invalid aggregate stage from AI', 400)
            }
            const stageKeys = Object.keys(stage)
            if (stageKeys.length !== 1) {
                throw new ChatServiceError('Each aggregate stage must contain a single operator', 400)
            }
            if (WRITE_STAGES.has(stageKeys[0])) {
                throw new ChatServiceError('Write stages are not allowed', 400)
            }
            if (hasForbiddenOperator(stage)) {
                throw new ChatServiceError('Forbidden MongoDB operator in AI query', 400)
            }
        }

        return {
            operation,
            pipeline,
            limit: Math.min(MAX_LIMIT, Math.max(1, Number(rawPlan?.limit) || DEFAULT_LIMIT)),
        }
    }

    const filter = rawPlan?.filter && typeof rawPlan.filter === 'object' ? rawPlan.filter : {}
    if (hasForbiddenOperator(filter)) {
        throw new ChatServiceError('Forbidden MongoDB operator in AI query', 400)
    }

    const sort = sanitizeSort(rawPlan?.sort)
    const projection = sanitizeProjection(rawPlan?.projection)

    return {
        operation,
        filter,
        sort,
        projection,
        limit: Math.min(MAX_LIMIT, Math.max(1, Number(rawPlan?.limit) || DEFAULT_LIMIT)),
    }
}

const buildReadOnlyQueryPlanWithOllama = async ({ message, symptomKeyword = '' }) => {
    const systemPrompt = [
        'Ban la AI tao MongoDB query cho collection products trong nha thuoc.',
        'Chi duoc tra ve JSON hop le, khong markdown.',
        'Chi duoc doc du lieu, khong update/delete/insert.',
        'Schema tra ve mot trong cac dang:',
        '{"operation":"find","filter":{},"projection":{},"sort":{},"limit":20}',
        '{"operation":"aggregate","pipeline":[{"$match":{}},{"$sort":{}},{"$limit":20}],"limit":20}',
        '{"operation":"countDocuments","filter":{}}',
    ].join(' ')

    const prompt = [
        `User message: "${String(message || '').trim()}"`,
        `Symptom keyword: "${String(symptomKeyword || '').trim()}"`,
        'Product fields: productName, medicineName, usageSummary, usage, description, targetUsers, activeIngredient, ingredients, mainIngredients, price, images, isActive, categoryName, brand, updatedAt.',
        'Return JSON only.',
    ].join('\n\n')

    const raw = await callOllama({
        prompt,
        system: systemPrompt,
        temperature: 0,
        format: 'json',
    })

    return parseOllamaJson(raw, {})
}

const executeReadOnlyProductQueryPlan = async (rawPlan) => {
    const plan = normalizeReadOnlyQueryPlan(rawPlan)

    if (plan.operation === 'countDocuments') {
        await Product.countDocuments({
            $and: [{ isActive: true }, plan.filter || {}],
        })
        return []
    }

    if (plan.operation === 'aggregate') {
        const pipeline = [{ $match: { isActive: true } }, ...plan.pipeline, { $limit: plan.limit }]
        const docs = await Product.aggregate(pipeline)
        return Array.isArray(docs) ? docs : []
    }

    const userFilter = plan.filter && Object.keys(plan.filter).length > 0 ? plan.filter : null
    const filter = userFilter ? { $and: [{ isActive: true }, userFilter] } : { isActive: true }

    const query = Product.find(filter)
        .sort(plan.sort)
        .limit(plan.limit)

    if (plan.projection) {
        query.select(plan.projection)
    } else {
        query.select(PRODUCT_DETAIL_FIELDS)
    }

    return query.lean()
}

const searchProductsByLocalRules = async ({ message, symptomKeyword = '' }) => {
    const candidateQueries = [symptomKeyword, message].map((item) => String(item || '').trim()).filter(Boolean)
    const conditions = []

    for (const entry of candidateQueries) {
        const normalized = normalizeText(entry)
        if (!normalized) {
            continue
        }

        const phraseRegex = new RegExp(escapeRegex(normalized).replace(/\s+/g, '.*'), 'i')
        conditions.push({ productName: phraseRegex })
        conditions.push({ medicineName: phraseRegex })
        conditions.push({ usageSummary: phraseRegex })
        conditions.push({ usage: phraseRegex })
        conditions.push({ description: phraseRegex })
        conditions.push({ activeIngredient: phraseRegex })
        conditions.push({ ingredients: phraseRegex })
        conditions.push({ mainIngredients: phraseRegex })

        for (const token of tokenizeQuery(entry)) {
            const tokenRegex = new RegExp(escapeRegex(token), 'i')
            conditions.push({ productName: tokenRegex })
            conditions.push({ medicineName: tokenRegex })
            conditions.push({ usageSummary: tokenRegex })
            conditions.push({ usage: tokenRegex })
            conditions.push({ description: tokenRegex })
            conditions.push({ activeIngredient: tokenRegex })
            conditions.push({ ingredients: tokenRegex })
            conditions.push({ mainIngredients: tokenRegex })
        }
    }

    if (conditions.length === 0) {
        return []
    }

    return Product.find({
        isActive: true,
        $or: conditions,
    })
        .select(PRODUCT_DETAIL_FIELDS)
        .sort({ updatedAt: -1 })
        .limit(40)
        .lean()
}

const mergeProductsById = (...groups) => {
    const byId = new Map()
    for (const group of groups) {
        if (!Array.isArray(group)) {
            continue
        }
        for (const item of group) {
            const id = String(item?._id || item?.id || '')
            if (!id || byId.has(id)) {
                continue
            }
            byId.set(id, item)
        }
    }
    return Array.from(byId.values())
}

const searchProductsForConsultation = async ({ message, symptomKeyword }) => {
    let aiDocs = []
    let aiPlan = null

    try {
        aiPlan = await buildReadOnlyQueryPlanWithOllama({ message, symptomKeyword })
        aiDocs = await executeReadOnlyProductQueryPlan(aiPlan)
    } catch {
        aiDocs = []
    }

    const localDocs = await searchProductsByLocalRules({ message, symptomKeyword })
    let merged = mergeProductsById(aiDocs, localDocs)

    if (merged.length < 4) {
        const recentDocs = await Product.find({ isActive: true })
            .select(PRODUCT_DETAIL_FIELDS)
            .sort({ updatedAt: -1 })
            .limit(40)
            .lean()

        merged = mergeProductsById(merged, recentDocs)
    }

    return {
        plan: aiPlan,
        products: merged.slice(0, 40).map(toProductCard),
    }
}

const classifyMessageFallback = (message) => {
    const normalized = normalizeText(message)
    const symptomKeyword = extractSymptomKeyword(message)
    const hasSocial = SOCIAL_HINT_REGEX.test(normalized)
    const hasConsult = PRODUCT_HINT_REGEX.test(normalized) || Boolean(symptomKeyword)
    const wantsHuman = HUMAN_HINT_REGEX.test(normalized)

    if (hasSocial && !hasConsult && !wantsHuman) {
        return {
            type: 'social',
            symptomKeyword: '',
            reply: 'Chao mung ban den voi nha thuoc T&Q. Neu can tu van suc khoe, minh luon san sang ho tro.',
            needsHuman: false,
        }
    }

    return {
        type: 'consult',
        symptomKeyword,
        reply: '',
        needsHuman: wantsHuman,
    }
}

const classifyClientMessage = async ({ message, history = [] }) => {
    const fallback = classifyMessageFallback(message)

    const compactHistory = history
        .slice(-6)
        .map((item) => `${item.senderType}: ${String(item.content || '').slice(0, 160)}`)
        .join('\n')

    const systemPrompt = [
        'Ban la AI phan loai tin nhan cho nha thuoc.',
        'Chi tra ve JSON hop le, khong markdown.',
        'Schema:',
        '{"type":"social|consult","symptomKeyword":"string","reply":"string","needsHuman":true|false}',
        'Neu la social: reply la loi chao ngan gon.',
        'Neu la consult: symptomKeyword la trieu chung neu co, reply de rong.',
    ].join(' ')

    const prompt = [
        `History:\n${compactHistory || '(empty)'}`,
        `User message: "${String(message || '').trim()}"`,
        'Return JSON only.',
    ].join('\n\n')

    try {
        const raw = await callOllama({
            prompt,
            system: systemPrompt,
            temperature: 0,
            format: 'json',
        })
        const parsed = parseOllamaJson(raw, {})

        const type = String(parsed.type || '').trim().toLowerCase()
        const normalizedType = type === 'social' ? 'social' : type === 'consult' ? 'consult' : fallback.type
        const symptomKeyword = String(parsed.symptomKeyword || fallback.symptomKeyword || '').trim()
        const reply = String(parsed.reply || '').trim()
        const needsHuman = Boolean(parsed.needsHuman) || fallback.needsHuman

        if (normalizedType === 'social') {
            return {
                type: 'social',
                symptomKeyword: '',
                reply:
                    reply ||
                    'Chao mung ban den voi nha thuoc T&Q. Neu can tu van suc khoe, minh luon san sang ho tro.',
                needsHuman,
            }
        }

        return {
            type: 'consult',
            symptomKeyword: symptomKeyword || fallback.symptomKeyword,
            reply: '',
            needsHuman,
        }
    } catch {
        return fallback
    }
}

const generateConsultReply = async ({ message, symptomKeyword, products }) => {
    if (!Array.isArray(products) || products.length === 0) {
        return 'Khong tim thay san pham phu hop'
    }

    const summary = products
        .slice(0, 4)
        .map((item, index) => `${index + 1}. ${item.productName} - ${Math.round(Number(item.price || 0)).toLocaleString('vi-VN')} VND`)
        .join('\n')

    const systemPrompt = [
        'Ban la duoc si AI than thien cua nha thuoc T&Q.',
        'Tra loi tieng Viet, ngan gon, thuc te, khong chan doan benh.',
        'Can dua loi khuyen co ban va gioi thieu san pham phu hop.',
        'Khong duoc che them thong tin ngoai du lieu da co.',
    ].join(' ')

    const prompt = [
        `Cau hoi cua khach: "${String(message || '').trim()}"`,
        `Trieu chung chinh: "${String(symptomKeyword || '').trim() || 'khong ro'}"`,
        `Danh sach san pham de goi y:\n${summary}`,
        'Hay viet 1 doan tra loi than thien, ket bang cau moi nguoi dung xem cac the san pham ben duoi.',
    ].join('\n\n')

    try {
        const text = await callOllama({
            prompt,
            system: systemPrompt,
            temperature: 0.4,
        })
        const cleaned = String(text || '').trim()
        if (cleaned) {
            return cleaned
        }
    } catch {
        // fallback below
    }

    if (symptomKeyword) {
        return `Ban dang gap trieu chung ${symptomKeyword}. Minh da chon mot so san pham phu hop de ban tham khao ben duoi.`
    }

    return 'Minh da tim thay mot so san pham phu hop de ban tham khao ben duoi.'
}

const extractOrderCode = (text) => {
    const match = String(text || '').toUpperCase().match(/ORD[0-9]{8,}/)
    return match ? match[0] : ''
}

const searchOrdersForUser = async ({ clientId, query }) => {
    const filter = { userId: clientId }
    const orderCode = extractOrderCode(query)

    if (orderCode) {
        filter.orderCode = new RegExp(`^${escapeRegex(orderCode)}$`, 'i')
    }

    const docs = await Order.find(filter)
        .select('orderCode status paymentStatus totalAmount placedAt items')
        .sort({ placedAt: -1 })
        .limit(orderCode ? 1 : 3)
        .lean()

    return docs.map((item) => ({
        id: String(item._id),
        orderCode: item.orderCode,
        status: item.status,
        paymentStatus: item.paymentStatus,
        totalAmount: Number(item.totalAmount || 0),
        placedAt: item.placedAt,
        items: (item.items || []).slice(0, 3).map((line) => ({
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
        })),
    }))
}

const handleClientMessage = async ({ clientId, clientName = '', conversationId, content }) => {
    ensureObjectId(clientId, 'clientId')

    const normalizedContent = String(content || '').trim()
    if (!normalizedContent) {
        throw new ChatServiceError('Message content is required', 400)
    }

    // Always use a virtual conversation
    const conversation = await findOrCreateActiveConversation(clientId)

    const userMessage = await appendMessage({
        conversationId: conversation._id,
        senderType: 'user',
        senderId: clientId,
        senderName: String(clientName || '').trim(),
        content: normalizedContent,
        intent: INTENTS.CHAT,
        action: INTENTS.CHAT,
    })

    const userMessagePayload = serializeMessage(userMessage)

    // Stateless classification (history is empty)
    const classification = await classifyClientMessage({
        message: normalizedContent,
        history: [],
    })

    if (classification.needsHuman) {
        const humanFlow = await requestHumanFromClient(clientId, conversation._id, 'user_requested_human')

        const botDoc = await appendMessage({
            conversationId: conversation._id,
            senderType: 'bot',
            content: 'Minh da chuyen yeu cau sang nhan vien. Trong luc cho, minh van co the goi y san pham cho ban.',
            intent: INTENTS.CALL_HUMAN,
            action: INTENTS.CALL_HUMAN,
            meta: {
                responseCategory: 'handoff',
            },
        })

        return {
            conversation: humanFlow.conversation,
            userMessage: userMessagePayload,
            botMessage: serializeMessage(botDoc),
            systemMessage: humanFlow.systemMessage,
            requiresHuman: true,
            action: INTENTS.CALL_HUMAN,
        }
    }

    if (classification.type === 'social') {
        const botDoc = await appendMessage({
            conversationId: conversation._id,
            senderType: 'bot',
            content: classification.reply,
            intent: INTENTS.SOCIAL_CHAT,
            action: INTENTS.CHAT,
            meta: {
                responseCategory: 'social_chat',
            },
        })

        return {
            conversation: serializeConversation(conversation),
            userMessage: userMessagePayload,
            botMessage: serializeMessage(botDoc),
            systemMessage: null,
            requiresHuman: false,
            action: INTENTS.CHAT,
        }
    }

    const symptomKeyword = classification.symptomKeyword || extractSymptomKeyword(normalizedContent)
    const { plan, products } = await searchProductsForConsultation({
        message: normalizedContent,
        symptomKeyword,
    })

    const suggestions = pickRandomItems(products, 4)
    const consultReply = await generateConsultReply({
        message: normalizedContent,
        symptomKeyword,
        products: suggestions,
    })

    const botDoc = await appendMessage({
        conversationId: conversation._id,
        senderType: 'bot',
        content: consultReply,
        intent: INTENTS.CONSULTATION,
        action: INTENTS.FIND_PRODUCT,
        meta: {
            responseCategory: 'product_consultation',
            symptomKeyword,
            queryPlan: plan || null,
            productSuggestions: suggestions,
        },
    })

    return {
        conversation: serializeConversation(conversation),
        userMessage: userMessagePayload,
        botMessage: serializeMessage(botDoc),
        systemMessage: null,
        requiresHuman: false,
        action: INTENTS.FIND_PRODUCT,
    }
}

const handleStaffMessage = async ({ staffId, staffName = '', conversationId, content }) => {
    const { staff, conversation } = await ensureStaffCanAccessConversation(staffId, conversationId)

    const adminMessage = await appendMessage({
        conversationId: conversation._id,
        senderType: 'admin',
        senderId: staffId,
        senderName: String(staffName || '').trim(),
        content,
        action: 'HUMAN_CHAT',
    })

    return {
        conversation: serializeConversation(conversation),
        message: serializeMessage(adminMessage),
    }
}

module.exports = {
    ChatServiceError,
    SUPPORT_ROLES,
    INTENTS,
    serializeConversation,
    serializeMessage,
    getClientConversationSnapshot,
    getClientMessages,
    requestHumanFromClient,
    assignConversationToStaff,
    closeConversationByStaff,
    listConversationsForAdmin,
    getConversationMessagesForAdmin,
    handleClientMessage,
    handleStaffMessage,
    searchOrdersForUser,
}
