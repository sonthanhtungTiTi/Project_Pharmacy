/**
 * chatCleanup.job.js
 * 
 * Cron job tự động chạy mỗi giờ:
 * - Tìm các cuộc hội thoại không có tin nhắn mới sau 12 tiếng
 * - Xóa toàn bộ tin nhắn trong cuộc hội thoại đó
 * - Đặt lại trạng thái conversation về 'closed'
 */

const ChatConversation = require('../models/chatConversation.model')
const ChatMessage = require('../models/chatMessage.model')

const INACTIVITY_HOURS = Number(process.env.CHAT_INACTIVITY_HOURS || 12)
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // kiểm tra mỗi 1 giờ

/**
 * Xóa tin nhắn và đóng các cuộc hội thoại không hoạt động
 * @returns {{ cleaned: number, skipped: number }}
 */
const cleanupInactiveConversations = async () => {
    const cutoffTime = new Date(Date.now() - INACTIVITY_HOURS * 60 * 60 * 1000)

    // Tìm tất cả conversation chưa đóng và không có tin nhắn mới trong INACTIVITY_HOURS giờ
    const staleConversations = await ChatConversation.find({
        status: { $in: ['ai', 'human_pending', 'human'] },
        lastMessageAt: { $lt: cutoffTime },
    })
        .select('_id clientId sessionId lastMessageAt')
        .lean()

    if (staleConversations.length === 0) {
        return { cleaned: 0, skipped: 0 }
    }

    const conversationIds = staleConversations.map((c) => c._id)

    // Xóa toàn bộ tin nhắn của các cuộc hội thoại này
    const deleteResult = await ChatMessage.deleteMany({
        conversationId: { $in: conversationIds },
    })

    // Đóng và reset các cuộc hội thoại
    await ChatConversation.updateMany(
        { _id: { $in: conversationIds } },
        {
            $set: {
                status: 'closed',
                assignedStaffId: null,
                unreadForClient: 0,
                unreadForAdmin: 0,
                lastIntent: 'GENERAL_FAQ',
                lastAction: 'GENERAL_FAQ',
                metadata: {},
            },
        },
    )

    console.log(
        `[ChatCleanup] Đã dọn dẹp ${staleConversations.length} cuộc hội thoại không hoạt động sau ${INACTIVITY_HOURS}h — xóa ${deleteResult.deletedCount} tin nhắn`,
    )

    return {
        cleaned: staleConversations.length,
        messagesDeleted: deleteResult.deletedCount,
    }
}

/**
 * Khởi động job cleanup — chạy ngay lần đầu rồi lặp lại theo interval
 */
const startChatCleanupJob = () => {
    const runJob = async () => {
        try {
            await cleanupInactiveConversations()
        } catch (err) {
            console.error('[ChatCleanup] Lỗi khi dọn dẹp chat:', err.message)
        }
    }

    // Chạy lần đầu sau 30 giây khi server khởi động (tránh chạy ngay khi server chưa ổn định)
    setTimeout(() => {
        runJob()
        setInterval(runJob, CHECK_INTERVAL_MS)
    }, 30_000)

    console.log(`✅ [ChatCleanup] Job khởi động — xóa chat sau ${INACTIVITY_HOURS}h không hoạt động, kiểm tra mỗi 1h`)
}

module.exports = { startChatCleanupJob, cleanupInactiveConversations }
