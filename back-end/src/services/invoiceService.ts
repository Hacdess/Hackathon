import type { ApiResponse, InvoiceData } from '../types/domain'

export const invoiceService = {
  async processInvoice(spokenText?: string): Promise<ApiResponse> {
    console.log('Seller said:', spokenText)

    const mockInvoice: InvoiceData = {
      ten_khach_hang: 'Co Bay ban rau',
      san_pham: 'Ao khoac gio',
      so_luong: 2,
      don_gia: 250000,
      tong_tien: 500000,
      can_xuat_hoa_don: true,
    }

    await new Promise((resolve) => setTimeout(resolve, 800))

    return {
      status: 'success',
      message: 'Extracted successfully',
      data: mockInvoice,
    }
  },
}
