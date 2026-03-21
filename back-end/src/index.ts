import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load biến môi trường
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 BẢN HỢP ĐỒNG DỮ LIỆU: Bắt buộc AI phải trả về đúng cấu trúc này!
// SE nhìn vào đây để làm UI, DS nhìn vào đây để viết Prompt.
interface InvoiceData {
    ten_khach_hang: string;
    san_pham: string;
    so_luong: number;
    don_gia: number;
    tong_tien: number;
    can_xuat_hoa_don: boolean;
}

// Cấu trúc chuẩn trả về cho Frontend
interface ApiResponse {
    status: 'success' | 'error';
    message: string;
    data?: InvoiceData;
}

app.get('/', (req: Request, res: Response) => {
    res.send('🚀 Tax Assistant API (TypeScript) is running!');
});

// Endpoint xử lý giọng nói thành JSON
app.post('/api/process-invoice', async (req: Request, res: Response<ApiResponse>) => {
    try {
        const { spokenText } = req.body;
        
        console.log("🗣️ Khách hàng vừa nói:", spokenText);

        // ==========================================
        // KHU VỰC DÀNH CHO TEAM DATA SCIENCE (DS)
        // Lát nữa sẽ nhét OpenAI vào đây. Output của OpenAI 
        // PHẢI được ép kiểu về đúng interface InvoiceData.
        // ==========================================

        // Mock Data đúng chuẩn TypeScript
        const mockInvoice: InvoiceData = {
            ten_khach_hang: "Cô Bảy bán rau",
            san_pham: "Áo khoác gió",
            so_luong: 2,
            don_gia: 250000,
            tong_tien: 500000,
            can_xuat_hoa_don: true
        };

        setTimeout(() => {
            // TypeScript sẽ báo lỗi ngay lập tức nếu em gõ sai tên biến ở mockInvoice
            res.json({
                status: 'success',
                message: 'Đã trích xuất thành công',
                data: mockInvoice
            });
        }, 1500);

    } catch (error) {
        console.error("❌ Lỗi Server:", error);
        res.status(500).json({ 
            status: "error", 
            message: "Có lỗi xảy ra, vui lòng thử lại." 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ TS Backend đã khởi động: http://localhost:${PORT}`);
});