// 业务单号：会话内递增序号（B-001 / RP-001），不依赖随机数
let bookingSeq = 0
let ticketSeq = 0

export function nextBookingId(): string {
  return `B-${String(++bookingSeq).padStart(3, '0')}`
}

export function nextTicketId(): string {
  return `RP-${String(++ticketSeq).padStart(3, '0')}`
}

/** 测试用：序号归零 */
export function resetIds(): void {
  bookingSeq = 0
  ticketSeq = 0
}
