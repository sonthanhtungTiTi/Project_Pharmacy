const axios = require('axios')
const mongoose = require('mongoose')

const ChatConversation = require('../../models/chatConversation.model')
const ChatMessage = require('../../models/chatMessage.model')
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

        if (trimmed.startsWith('data:')) {
            return trimmed
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

const extractImageFromMeta = (meta) => {
    if (!meta || typeof meta !== 'object') {
        return ''
    }

    return normalizeImageField(meta.imageUrl || meta.image || '')
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

    let conversation = await ChatConversation.findOne({ clientId })
        .sort({ updatedAt: -1 })
        .populate('clientId', 'fullName email phone role')

    if (!conversation) {
        conversation = await ChatConversation.create({
            sessionId: createSessionId(clientId),
            clientId,
            status: 'ai',
            lastIntent: INTENTS.GENERAL_FAQ,
            lastAction: INTENTS.GENERAL_FAQ,
            metadata: {},
            unreadForClient: 0,
            unreadForAdmin: 0,
        })
        await conversation.populate('clientId', 'fullName email phone role')
    } else if (conversation.status === 'closed') {
        conversation.status = 'ai'
        conversation.lastAction = INTENTS.GENERAL_FAQ
        await conversation.save()
    }

    return conversation
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

    const message = await ChatMessage.create({
        conversationId,
        senderType,
        senderId: senderId && mongoose.Types.ObjectId.isValid(senderId) ? senderId : null,
        senderName: String(senderName || '').trim(),
        content: String(content).trim(),
        intent,
        action,
        meta,
    })

    return message
}

const getConversationMessages = async (conversationId, limit = 40) => {
    const messages = await ChatMessage.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(Math.min(MAX_LIMIT, Math.max(1, limit)))
        .lean()

    return messages.reverse()
}

const touchConversation = async (conversationId, payload = {}) => {
    const updatePayload = {
        ...payload,
        lastMessageAt: new Date(),
    }

    const updated = await ChatConversation.findByIdAndUpdate(
        conversationId,
        { $set: updatePayload },
        { new: true }
    ).populate('clientId', 'fullName email phone role')
        .populate('assignedStaffId', 'fullName email phone role')

    return updated
}

const getClientConversationSnapshot = async (clientId, { limit = 40 } = {}) => {
    const conversation = await findOrCreateActiveConversation(clientId)
    const messages = await getConversationMessages(conversation._id, limit)

    return {
        conversation: serializeConversation(conversation),
        messages: messages.map(serializeMessage),
    }
}

const getClientMessages = async (clientId, conversationId, { limit = 40 } = {}) => {
    ensureObjectId(clientId, 'clientId')
    ensureObjectId(conversationId, 'conversationId')

    const conversation = await ChatConversation.findOne({
        _id: conversationId,
        clientId,
    }).populate('clientId', 'fullName email phone role')
        .populate('assignedStaffId', 'fullName email phone role')

    if (!conversation) {
        throw new ChatServiceError('Conversation not found', 404)
    }

    const messages = await getConversationMessages(conversation._id, limit)

    return {
        conversation: serializeConversation(conversation),
        messages: messages.map(serializeMessage),
    }
}

const requestHumanFromClient = async (clientId, conversationId = null, reason = '') => {
    ensureObjectId(clientId, 'clientId')

    let conversation
    if (conversationId) {
        conversation = await ChatConversation.findOne({ _id: conversationId, clientId })
    }

    if (!conversation) {
        conversation = await ChatConversation.findOne({ clientId }).sort({ updatedAt: -1 })
    }

    if (!conversation) {
        conversation = await ChatConversation.create({
            sessionId: createSessionId(clientId),
            clientId,
            status: 'human_pending',
            lastAction: INTENTS.CALL_HUMAN,
            metadata: {
                lastHumanRequestReason: String(reason || '').trim(),
            },
        })
    } else {
        conversation.status = 'human_pending'
        conversation.lastAction = INTENTS.CALL_HUMAN
        conversation.metadata = {
            ...conversation.metadata,
            lastHumanRequestReason: String(reason || '').trim(),
        }
        await conversation.save()
    }

    await conversation.populate('clientId', 'fullName email phone role')
    await conversation.populate('assignedStaffId', 'fullName email phone role')

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

    const conversation = await ChatConversation.findById(conversationId)
        .populate('clientId', 'fullName email phone role')
        .populate('assignedStaffId', 'fullName email phone role')

    if (!conversation) {
        throw new ChatServiceError('Conversation not found', 404)
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
        content: 'Đã có nhân viên hỗ trợ',
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
        content: 'Đã kết thúc tư vấn',
        action: 'CLOSED_BY_STAFF',
    })

    return {
        conversation: serializeConversation(updated),
        systemMessage: serializeMessage(systemMessage),
    }
}

const listConversationsForAdmin = async ({ status = 'all', page = 1, limit = 20, keyword = '' } = {}) => {
    const filter = {}

    if (status !== 'all') {
        filter.status = status
    }

    if (keyword) {
        const regex = new RegExp(escapeRegex(keyword), 'i')
        filter.$or = [{ sessionId: regex }]
    }

    const numericPage = Math.max(1, Number(page) || 1)
    const numericLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT))
    const skip = (numericPage - 1) * numericLimit

    const [docs, total] = await Promise.all([
        ChatConversation.find(filter)
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .skip(skip)
            .limit(numericLimit)
            .populate('clientId', 'fullName email phone role')
            .populate('assignedStaffId', 'fullName email phone role')
            .lean(),
        ChatConversation.countDocuments(filter),
    ])

    // Lấy tin nhắn mới nhất
    const conversationIds = docs.map(doc => doc._id)
    const latestMessages = await ChatMessage.aggregate([
        { $match: { conversationId: { $in: conversationIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$conversationId", latestMessage: { $first: "$$ROOT" } } }
    ])

    const messageMap = new Map()
    for (const item of latestMessages) {
        messageMap.set(String(item._id), item.latestMessage)
    }

    const items = docs.map((doc) => {
        const serialized = serializeConversation(doc)
        const latestMsg = messageMap.get(String(doc._id))
        return {
            ...serialized,
            latestMessage: latestMsg ? serializeMessage(latestMsg) : null
        }
    })

    return {
        items,
        pagination: {
            page: numericPage,
            limit: numericLimit,
            total,
            totalPages: Math.ceil(total / numericLimit),
        },
    }
}

const getConversationMessagesForAdmin = async (staffId, conversationId, { limit = 80 } = {}) => {
    const { conversation } = await ensureStaffCanAccessConversation(staffId, conversationId)
    const messages = await getConversationMessages(conversation._id, limit)

    return {
        conversation: serializeConversation(conversation),
        messages: messages.map(serializeMessage),
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
        productUrl: `https://nhathuocqt.shop/product/${id}`,
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

const createWordRegex = (word) => {
    // Sử dụng Unicode property escapes (\p{L}) để giả lập \b cho mọi ngôn ngữ kể cả Tiếng Việt
    // Đảm bảo từ khóa không bị dính vào một từ khác (ví dụ: "ứng" không match "chứng")
    return new RegExp(`(?<=^|[^\\p{L}\\p{N}_])(${escapeRegex(word)})(?=[^\\p{L}\\p{N}_]|$)`, 'iu')
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
        'Bạn là AI tạo MongoDB query cho collection products trong nhà thuốc.',
        'Chỉ được trả về JSON hợp lệ, TUYỆT ĐỐI không có markdown.',
        'Chỉ được đọc dữ liệu, không update/delete/insert.',
        'Khi tìm kiếm chuỗi văn bản (text), LUÔN LUÔN dùng toán tử $regex với $options: "i" để tìm kiếm tương đối và không phân biệt chữ hoa chữ thường. Ví dụ: {"filter": {"productName": {"$regex": "panadol", "$options": "i"}}}',
        'Schema trả về một trong các dạng:',
        '{"operation":"find","filter":{},"projection":{},"sort":{},"limit":20}',
        '{"operation":"aggregate","pipeline":[{"$match":{}},{"$sort":{}},{"$limit":20}],"limit":20}'
    ].join('\n')

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

const createVietnameseRegexStr = (str) => {
    const map = {
        'a': '[aAàÀảẢãÃáÁạẠăĂằẰẳẲẵẴắẮặẶâÂầẦẩẨẫẪấẤậẬ]',
        'e': '[eEèÈẻẺẽẼéÉẹẸêÊềỀểỂễỄếẾệỆ]',
        'i': '[iIìÌỉỈĩĨíÍịỊ]',
        'o': '[oOòÒỏỎõÕóÓọỌôÔồỒổỔỗỖốỐộỘơƠờỜởỞỡỠớỚợỢ]',
        'u': '[uUùÙủỦũŨúÚụỤưƯừỪửỬữỮứỨựỰ]',
        'y': '[yYỳỲỷỶỹỸýÝỵỴ]',
        'd': '[dDđĐ]'
    };
    const normalized = String(str).toLowerCase();
    let regexStr = '';
    for (const char of normalized) {
        if (map[char]) regexStr += map[char];
        else regexStr += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return regexStr;
};

const searchProductsByLocalRules = async ({ message, symptomKeyword = '' }) => {
    const normalizedMessage = normalizeText(message);
    const activeKeywords = new Set();

    // 1. Lấy từ khóa chính và tách nhỏ nó ra (Phòng trường hợp AI gộp bệnh)
    if (symptomKeyword) {
        const normalizedSymptom = normalizeText(symptomKeyword);
        activeKeywords.add(normalizedSymptom);

        const symptomTokens = tokenizeQuery(normalizedSymptom);
        symptomTokens.forEach(t => activeKeywords.add(t));
    }

    // 2. BẮT TỪ KHÓA DỰA TRÊN DANH MỤC SẢN PHẨM THỰC TẾ
    const medicalTerms = [
        // --- 1. Cơ xương khớp, gút ---
        'co xuong khop', 'xuong khop', 'gut', 'gout', 'viem khop', 'thoai hoa khop',
        'dau khop', 'dau lung', 'dau vai gay', 'dau co', 'nhuc moi', 'bong gan', 'canxi',

        // --- 2. Da liễu, dị ứng ---
        'da lieu', 'di ung', 'giam ngua', 'noi me day', 'man ngua', 'rom say', 'ham ta',
        'mun nhot', 'tri mun', 'nam da', 'lang ben', 'hac lao', 'con trung', 'muoi dot',
        'muoi chich', 'kien ba khoang', 'bong', 'tri seo',

        // --- 3. Dầu, Cao Xoa, Miếng Dán ---
        'dau gio', 'dau tram', 'dau khuynh diep', 'dau nong', 'dau cu la', 'xoa bop',
        'cao xoa', 'mieng dan', 'mieng dan ha sot', 'cao dan',

        // --- 4. Giảm đau, hạ sốt, kháng viêm ---
        'giam dau', 'ha sot', 'khang viem', 'chong viem', 'dau dau', 'nhuc dau',
        'dau rang', 'nhuc rang', 'dau bung',

        // --- 5. Hô hấp ---
        'ho hap', 'bo phe', 'tieu dom', 'giam ho', 'ho khan', 'ho dom', 'kho tho', 'hen suyen',

        // --- 6. Kháng sinh, kháng nấm ---
        'khang sinh', 'khang nam', 'nhiem trung', 'viem nhiem',

        // --- 7. Mắt, tai mũi họng ---
        'bo mat', 'nho mat', 'rua mat', 'kho mat', 'moi mat', 'dau mat do',
        'viem hong', 'dau hong', 'rat hong', 'viem xoang', 'viem mui', 'nghet mui',
        'ngat mui', 'so mui', 'chay nuoc mui', 'nuoc muoi sinh ly', 'nho mui', 'xit mui',
        'rua mui', 'nhiet mieng', 'viem nuou', 'chay mau chan rang', 'nuoc suc mieng',

        // --- 8. Thần kinh, não bộ ---
        'than kinh', 'nao bo', 'chong mat', 'buon non', 'say xe', 'roi loan tien dinh',
        'bo nao', 'hoat huyet', 'tuan hoan nao', 'an than', 'mat ngu',

        // --- 9. Tiêu hóa, gan mật ---
        'tieu hoa', 'gan mat', 'da day', 'ta trang', 'trao nguoc', 'viem loet',
        'tieu chay', 'tao bon', 'day hoi', 'kho tieu', 'chuong bung', 'men tieu hoa',
        'men vi sinh', 'bu nuoc', 'oresol', 'bo gan', 'mat gan', 'giai doc gan', 'tri',

        // --- 10. Tiết niệu, sinh dục ---
        'tiet nieu', 'sinh duc', 'viem duong tiet nieu', 'soi than', 'phu khoa',
        'dung dich ve sinh', 'bao cao su', 'gel boi tron', 'que thu thai',

        // --- 11. Hỗ hợp (Vật tư y tế, Vitamin, Làm đẹp,...) ---
        'vitamin', 'tang de khang', 'sat trung', 'povidine', 'oxy gia', 'con y te',
        'bang keo', 'bang gach', 'bong gon', 'khau trang', 'nhiet ke', 'sua rua mat',
        'bang ve sinh', 'dau goi', 'sua tam'
    ];

    for (const term of medicalTerms) {
        if (normalizedMessage.includes(term)) {
            activeKeywords.add(term);
        }
    }

    const targetPhrases = Array.from(activeKeywords).filter(Boolean);
    const conditions = [];

    // 3. Build Regex thông minh cho cụm từ (Ưu tiên cao)
    if (targetPhrases.length > 0) {
        for (const phrase of targetPhrases) {
            const vnRegexStr = createVietnameseRegexStr(phrase);
            const regex = new RegExp(vnRegexStr, 'i');
            conditions.push({ productName: regex });
            conditions.push({ medicineName: regex });
            conditions.push({ usageSummary: regex });
            conditions.push({ categoryName: regex });
        }
    }

    // 4. LUÔN LUÔN chạy Tokenizer để tách từng chữ (Bắt chính xác từng token)
    const tokens = tokenizeQuery(normalizedMessage);
    for (const token of tokens) {
        const vnRegexStr = createVietnameseRegexStr(token);
        const regex = new RegExp(vnRegexStr, 'i');
        conditions.push({ productName: regex });
        conditions.push({ usageSummary: regex });
    }

    if (conditions.length === 0) return [];

    // 5. Query Database
    const rawDocs = await Product.find({
        isActive: true,
        $or: conditions,
    })
        .select(PRODUCT_DETAIL_FIELDS)
        .lean();

    // 6. Thuật toán Scoring thông minh
    const scoredDocs = rawDocs.map(doc => {
        let score = 0;
        const normalizedName = normalizeText(doc.productName);
        const textToSearch = [
            normalizedName,
            normalizeText(doc.usageSummary),
            normalizeText(doc.categoryName)
        ].join(' ');

        if (targetPhrases.length > 0) {
            targetPhrases.forEach(phrase => {
                if (textToSearch.includes(phrase)) score += 10;
                if (normalizedName.includes(phrase)) score += 50; // Trúng tên cụm từ -> Lên Top
                if (normalizeText(doc.categoryName).includes(phrase)) score += 20; // Trúng tên danh mục -> Cộng điểm mạnh
                if (normalizeText(doc.usageSummary).includes(phrase)) score += 15;
            });
        }

        tokens.forEach(token => {
            if (textToSearch.includes(token)) score += 2;
            if (normalizedName.includes(token)) score += 5;
        });

        score += (doc.updatedAt ? new Date(doc.updatedAt).getTime() / 1000000000000 : 0);
        return { ...doc, score };
    });

    scoredDocs.sort((a, b) => b.score - a.score);

    return scoredDocs.slice(0, 40).map(doc => {
        delete doc.score;
        return doc;
    });
};

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
            reply: 'Chào mừng bạn đến với nhà thuốc T&Q. Nếu cần tư vấn sức khỏe, mình luôn sẵn sàng hỗ trợ.',
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
        'Bạn là Trợ lý AI phân tích ngữ nghĩa của nhà thuốc T&Q. Trách nhiệm của bạn là đọc tin nhắn và phân loại chính xác ý định của khách. TUYỆT ĐỐI chỉ trả về chuỗi JSON với định dạng: {"type":"social"|"consult", "symptomKeyword":"string", "reply":"string", "needsHuman":true|false}',
        'HÃY HỌC THUỘC 5 NHÓM TÌNH HUỐNG SAU VÀ BẮT CHƯỚC CÁCH PHÂN LOẠI:',

        '--- NHÓM 1: HỎI THÔNG TIN SẢN PHẨM / THUỐC (needsHuman LUÔN LÀ false) ---',
        'Lưu ý: Mọi câu hỏi có chữ "có... không", "dùng được không", "giá bao nhiêu" đều thuộc nhóm này.',
        'Tin nhắn: "thuốc này có tác dụng phụ gì không?" -> {"type":"consult", "symptomKeyword":"tác dụng phụ", "reply":"", "needsHuman":false}',
        'Tin nhắn: "trẻ 5 tuổi có uống được loại này không bạn" -> {"type":"consult", "symptomKeyword":"trẻ 5 tuổi", "reply":"", "needsHuman":false}',
        'Tin nhắn: "uống cái này có bị buồn ngủ không" -> {"type":"consult", "symptomKeyword":"buồn ngủ", "reply":"", "needsHuman":false}',
        'Tin nhắn: "giá 1 hộp là bao nhiêu" -> {"type":"consult", "symptomKeyword":"giá", "reply":"", "needsHuman":false}',
        'Tin nhắn: "thuốc này uống trước hay sau khi ăn" -> {"type":"consult", "symptomKeyword":"cách dùng", "reply":"", "needsHuman":false}',

        '--- NHÓM 2: KHAI BÁO TRIỆU CHỨNG, TÌM KIẾM SẢN PHẨM (needsHuman: false) ---',
        'Lưu ý: Nếu khách VỪA CHÀO VỪA KHAI BỆNH, phải ưu tiên bắt bệnh. Bóc tách từ khóa cốt lõi vào symptomKeyword.',
        'Tin nhắn: "tôi bị đau đầu sổ mũi từ hôm qua" -> {"type":"consult", "symptomKeyword":"đau đầu sổ mũi", "reply":"", "needsHuman":false}',
        'Tin nhắn: "chào bạn, bé nhà mình bị tiêu chảy" -> {"type":"consult", "symptomKeyword":"tiêu chảy", "reply":"", "needsHuman":false}',
        'Tin nhắn: "shop có bán vitamin c không" -> {"type":"consult", "symptomKeyword":"vitamin c", "reply":"", "needsHuman":false}',
        'Tin nhắn: "cho mình hỏi mua thuốc trị mụn nhọt" -> {"type":"consult", "symptomKeyword":"trị mụn nhọt", "reply":"", "needsHuman":false}',

        '--- NHÓM 3: ĐÒI GẶP NGƯỜI THẬT HOẶC ĐỒNG Ý KẾT NỐI (needsHuman: true) ---',
        'Tin nhắn: "cho tôi gặp nhân viên tư vấn" -> {"type":"social", "symptomKeyword":"", "reply":"", "needsHuman":true}',
        'Tin nhắn: "tôi muốn gặp bác sĩ" -> {"type":"social", "symptomKeyword":"", "reply":"", "needsHuman":true}',
        'Tin nhắn: "ok", "vâng", "ừ", "có", "dạ được" (chỉ trả lời ngắn gọn khi bot hỏi có muốn gặp không) -> {"type":"social", "symptomKeyword":"", "reply":"", "needsHuman":true}',

        '--- NHÓM 4: KHIẾU NẠI, ĐƠN HÀNG, CẤP CỨU (Cần người thật xử lý -> needsHuman: true) ---',
        'Tin nhắn: "tại sao tôi chưa nhận được hàng" -> {"type":"social", "symptomKeyword":"", "reply":"", "needsHuman":true}',
        'Tin nhắn: "uống thuốc vào bị nổi mẩn đỏ khắp người" -> {"type":"social", "symptomKeyword":"", "reply":"", "needsHuman":true}',
        'Tin nhắn: "shop giao sai thuốc cho tôi rồi" -> {"type":"social", "symptomKeyword":"", "reply":"", "needsHuman":true}',

        '--- NHÓM 5: GIAO TIẾP, HỎI ĐÁP NGOÀI LỀ (needsHuman: false) ---',
        'Tin nhắn: "chào shop" -> {"type":"social", "symptomKeyword":"", "reply":"Chào bạn! Mình là Dược sĩ AI của T&Q. Bạn cần tìm thuốc hay tư vấn sức khỏe ạ?", "needsHuman":false}',
        'Tin nhắn: "cảm ơn bạn nhiều" -> {"type":"social", "symptomKeyword":"", "reply":"Dạ không có chi ạ! Chúc bạn thật nhiều sức khỏe. Nếu cần gì thêm cứ nhắn mình nhé!", "needsHuman":false}',
        'Tin nhắn: "phí ship thế nào vậy" -> {"type":"social", "symptomKeyword":"", "reply":"Dạ bên mình freeship cho đơn hàng từ 150k trở lên ạ.", "needsHuman":false}'
    ].join(' ');
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
        let needsHuman = Boolean(parsed.needsHuman) || fallback.needsHuman

        const msgToCheck = normalizeText(message);
        const isInfoQuestion = msgToCheck.includes('co dung duoc khong') ||
            msgToCheck.includes('tre em') ||
            msgToCheck.includes('tac dung phu') ||
            msgToCheck.includes('ba bau') ||
            msgToCheck.includes('uong nhu the nao');

        if (isInfoQuestion) {
            needsHuman = false;
        }

        // TUY NHIÊN: Đảm bảo khách gõ chữ "gặp nhân viên" thì vẫn chuyển máy bình thường
        if (fallback.needsHuman) {
            needsHuman = true;
        }
        if (normalizedType === 'social') {
            return {
                type: 'social',
                symptomKeyword: '',
                reply:
                    reply ||
                    'Chào mừng bạn đến với nhà thuốc T&Q. Nếu cần tư vấn sức khỏe, mình luôn sẵn sàng hỗ trợ.',
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
        return 'Xin lỗi bạn, hiện tại hệ thống chưa tìm thấy sản phẩm nào phù hợp với mô tả của bạn. Bạn có muốn kết nối với nhân viên để được hỗ trợ tìm thuốc không?'
    }

    const summary = products
        .slice(0, 4)
        .map((item, index) => `${index + 1}. ${item.productName} - ${Math.round(Number(item.price || 0)).toLocaleString('vi-VN')} VND`)
        .join('\n')

    const systemPrompt = [
        'Bạn là Dược sĩ AI chuyên nghiệp, tận tâm của hệ thống nhà thuốc T&Q.',
        'Nhiệm vụ của bạn là tư vấn sức khỏe dựa trên triệu chứng của khách hàng và giới thiệu các sản phẩm có sẵn trong "Danh sách sản phẩm để gợi ý".',
        'QUY TẮC TRẢ LỜI:',
        '1. LUÔN LUÔN giao tiếp bằng Tiếng Việt có dấu, chuẩn ngữ pháp, giọng điệu ân cần.',
        '2. Thấu cảm và đưa ra lời khuyên y tế: Nếu khách nói bệnh (VD: nhức đầu), hãy khuyên họ nghỉ ngơi, uống nhiều nước trước khi giới thiệu thuốc.',
        '3. KHÔNG ĐƯỢC liệt kê trực tiếp tên/giá thuốc vào câu trả lời, vì hệ thống đã tự động hiển thị danh sách thẻ sản phẩm ở ngay bên dưới tin nhắn của bạn.',
        '4. XỬ LÝ CÂU HỎI KHÓ (QUAN TRỌNG): Nếu câu hỏi quá phức tạp hoặc bạn KHÔNG CHẮC CHẮN 100% về mặt y khoa, TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ BỊA ĐẶT. Hãy trả lời theo mẫu sau:',
        '"Dạ, đối với vấn đề của quý khách, để đảm bảo an toàn sức khỏe tuyệt đối, bạn có muốn mình kết nối với Dược sĩ/Bác sĩ chuyên môn của nhà thuốc để tư vấn trực tiếp cho bạn không ạ?"',
        '5. Kết thúc bằng một câu mời thân thiện: "Bạn có thể tham khảo các sản phẩm mình gợi ý bên dưới, hoặc nhấn nút yêu cầu tư vấn nếu cần dược sĩ hỗ trợ thêm nhé!"',
        '6.Nếu khách hỏi sâu về tác dụng phụ, độ tuổi sử dụng, tương tác thuốc... hãy tìm thông tin trong phần mô tả sản phẩm để trả lời.',

        '(--- PHẦN BỔ SUNG ĐỂ HỆ THỐNG XỬ LÝ LOGIC ---)',
        '* LƯU Ý 1: Nếu bạn đã phải áp dụng Quy tắc 4 (Khuyên kết nối bác sĩ), bạn TUYỆT ĐỐI PHẢI BỎ QUA Quy tắc 3 và Quy tắc 5. KHÔNG ĐƯỢC vừa khuyên gặp bác sĩ lại vừa mời mua thuốc.',
        '* LƯU Ý 2: Ở Quy tắc 6, nếu phần mô tả sản phẩm KHÔNG CÓ thông tin để trả lời, BẮT BUỘC chuyển sang dùng ngay câu trả lời của Quy tắc 4.',
        '',
        'HÃY XEM CÁC VÍ DỤ SAU ĐỂ HIỂU CÁCH VẬN DỤNG CÁC QUY TẮC TRÊN:',
        'Ví dụ Khách hỏi bệnh: "Tôi bị đau đầu quá"',
        'AI Trả lời (Dùng QT 2, 3, 5): "Dạ, bạn đang bị đau đầu thì nên dành thời gian nghỉ ngơi nơi yên tĩnh nhé. Bạn có thể tham khảo các sản phẩm giảm đau mình gợi ý bên dưới, hoặc nhấn nút yêu cầu tư vấn nếu cần dược sĩ hỗ trợ thêm nhé!"',
        '',
        'Ví dụ Khách hỏi câu khó: "Trẻ sơ sinh có bôi được thuốc này không?"',
        'AI Trả lời (Dùng QT 4 - KHÔNG CÓ CÂU MỜI MUA THUỐC Ở DƯỚI): "Dạ, đối với vấn đề của quý khách, để đảm bảo an toàn sức khỏe tuyệt đối, bạn có muốn mình kết nối với Dược sĩ/Bác sĩ chuyên môn của nhà thuốc để tư vấn trực tiếp cho bạn không ạ?"'
    ].join('\n');

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
        return `Bạn đang gặp triệu chứng ${symptomKeyword}. Mình đã chọn một số sản phẩm phù hợp để bạn tham khảo bên dưới.`
    }

    return 'Mình đã tìm thấy một số sản phẩm phù hợp để bạn tham khảo bên dưới.'
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

const handleClientMessage = async ({ clientId, clientName = '', conversationId, content, meta = {} }) => {
    ensureObjectId(clientId, 'clientId')

    const imageUrl = extractImageFromMeta(meta)
    const normalizedContent = String(content || '').trim()
    if (!normalizedContent && !imageUrl) {
        throw new ChatServiceError('Message content is required', 400)
    }

    const finalContent = normalizedContent || (imageUrl ? 'Ảnh đính kèm' : '')
    const finalMeta = imageUrl
        ? {
            ...meta,
            imageUrl,
        }
        : meta

    const conversation = await findOrCreateActiveConversation(clientId)

    const userMessage = await appendMessage({
        conversationId: conversation._id,
        senderType: 'user',
        senderId: clientId,
        senderName: String(clientName || '').trim(),
        content: finalContent,
        intent: INTENTS.CHAT,
        action: INTENTS.CHAT,
        meta: finalMeta,
    })

    const userMessagePayload = serializeMessage(userMessage)

    if (conversation.status === 'human' || conversation.status === 'human_pending') {
        const updatedConversation = await touchConversation(conversation._id, {
            unreadForAdmin: Number(conversation.unreadForAdmin || 0) + 1
        })

        return {
            conversation: serializeConversation(updatedConversation),
            userMessage: userMessagePayload,
            botMessage: null,
            systemMessage: null,
            requiresHuman: false,
            action: INTENTS.CHAT,
        }
    }

    if (imageUrl) {
        const shouldEscalate = conversation.status !== 'human' && conversation.status !== 'human_pending'
        const updatedConversation = await touchConversation(conversation._id, {
            status: shouldEscalate ? 'human_pending' : conversation.status,
            lastAction: shouldEscalate ? INTENTS.CALL_HUMAN : conversation.lastAction,
            metadata: shouldEscalate
                ? {
                    ...conversation.metadata,
                    lastHumanRequestReason: 'image_upload',
                }
                : conversation.metadata,
            unreadForAdmin: Number(conversation.unreadForAdmin || 0) + 1,
        })

        return {
            conversation: serializeConversation(updatedConversation),
            userMessage: userMessagePayload,
            botMessage: null,
            systemMessage: null,
            requiresHuman: shouldEscalate,
            action: shouldEscalate ? INTENTS.CALL_HUMAN : INTENTS.CHAT,
        }
    }

    const rawHistory = await ChatMessage.find({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
    const history = rawHistory.reverse()

    const classification = await classifyClientMessage({
        message: normalizedContent,
        history,
    })

    if (classification.needsHuman) {
        const humanReqResult = await requestHumanFromClient(clientId, conversation._id, 'AI detected human request')

        return {
            conversation: serializeConversation(humanReqResult.conversation),
            userMessage: userMessagePayload,
            botMessage: serializeMessage(humanReqResult.systemMessage),
            systemMessage: serializeMessage(humanReqResult.systemMessage),
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

        const updatedConversation = await touchConversation(conversation._id, {
            unreadForAdmin: Number(conversation.unreadForAdmin || 0) + 1
        })

        return {
            conversation: serializeConversation(updatedConversation),
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

    const suggestions = products.slice(0, 4)
    const consultReply = await generateConsultReply({
        message: normalizedContent,
        symptomKeyword,
        products: suggestions,
    })

    let responseCategory = 'product_consultation'
    if (consultReply.includes('kết nối với Dược sĩ/Bác sĩ') || consultReply.includes('kết nối với nhân viên')) {
        responseCategory = 'suggest_human'
    }

    const botDoc = await appendMessage({
        conversationId: conversation._id,
        senderType: 'bot',
        content: consultReply,
        intent: INTENTS.CONSULTATION,
        action: INTENTS.FIND_PRODUCT,
        meta: {
            responseCategory,
            symptomKeyword,
            queryPlan: plan || null,
            productSuggestions: suggestions,
        },
    })

    const updatedConversation = await touchConversation(conversation._id, {
        unreadForAdmin: Number(conversation.unreadForAdmin || 0) + 1
    })

    return {
        conversation: serializeConversation(updatedConversation),
        userMessage: userMessagePayload,
        botMessage: serializeMessage(botDoc),
        systemMessage: null,
        requiresHuman: false,
        action: INTENTS.FIND_PRODUCT,
    }
}

const handleStaffMessage = async ({ staffId, staffName = '', conversationId, content, meta = {} }) => {
    const { staff, conversation } = await ensureStaffCanAccessConversation(staffId, conversationId)
    const imageUrl = extractImageFromMeta(meta)
    const normalizedContent = String(content || '').trim()
    if (!normalizedContent && !imageUrl) {
        throw new ChatServiceError('Message content is required', 400)
    }
    const finalContent = normalizedContent || (imageUrl ? 'Ảnh đính kèm' : '')
    const finalMeta = imageUrl
        ? {
            ...meta,
            imageUrl,
        }
        : meta

    const adminMessage = await appendMessage({
        conversationId: conversation._id,
        senderType: 'admin',
        senderId: staffId,
        senderName: String(staffName || '').trim(),
        content: finalContent,
        action: 'HUMAN_CHAT',
        meta: finalMeta,
    })

    const updatedConversation = await touchConversation(conversation._id, {
        unreadForClient: Number(conversation.unreadForClient || 0) + 1,
        unreadForAdmin: 0
    })

    return {
        conversation: serializeConversation(updatedConversation),
        message: serializeMessage(adminMessage),
    }
}

const createPrescriptionRequestMessage = async (clientId, conversationId, productName) => {
    ensureObjectId(clientId, 'clientId')

    let conversation
    if (conversationId) {
        conversation = await ChatConversation.findOne({ _id: conversationId, clientId })
    }

    if (!conversation) {
        conversation = await ChatConversation.findOne({ clientId }).sort({ updatedAt: -1 })
    }

    if (!conversation) {
        conversation = await ChatConversation.create({
            sessionId: createSessionId(clientId),
            clientId,
            status: 'human_pending',
            lastAction: INTENTS.CALL_HUMAN,
            metadata: {
                lastHumanRequestReason: `Prescription consultation for ${productName}`,
            },
        })
    } else {
        conversation.status = 'human_pending'
        conversation.lastAction = INTENTS.CALL_HUMAN
        conversation.metadata = {
            ...conversation.metadata,
            lastHumanRequestReason: `Prescription consultation for ${productName}`,
        }
        await conversation.save()
    }

    await conversation.populate('clientId', 'fullName email phone role')
    await conversation.populate('assignedStaffId', 'fullName email phone role')

    const systemMessage = await appendMessage({
        conversationId: conversation._id,
        senderType: 'system',
        content: `Khách hàng cần tư vấn để mua thuốc kê đơn: [${productName}]`,
        action: INTENTS.CALL_HUMAN,
        meta: {
            reason: `Prescription consultation for ${productName}`,
            requiresPrescription: true,
            productName: productName
        },
    })

    return {
        conversation: serializeConversation(conversation),
        systemMessage: serializeMessage(systemMessage),
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
    createPrescriptionRequestMessage,
}
