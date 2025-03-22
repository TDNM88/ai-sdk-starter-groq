import { tool } from "ai";
import { z } from "zod";
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { Chart } from 'chart.js';
import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream';

export const weatherTool = tool({
  description: "Lấy thông tin thời tiết",
  parameters: z.object({
    location: z.string().describe("Địa điểm cần lấy thông tin thời tiết"),
  }),
  execute: async ({ location }) => {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${process.env.OPENWEATHERMAP_API_KEY}&units=metric&lang=vi`
    );

    if (!response.ok) {
      throw new Error("Không thể lấy thông tin thời tiết");
    }

    const data = await response.json();
    return {
      location: data.name,
      temperature: data.main.temp,
      weather: data.weather[0].description,
      humidity: data.main.humidity,
      wind: data.wind.speed,
      message: `Thời tiết tại ${data.name}: ${data.weather[0].description}, nhiệt độ ${data.main.temp}°C`
    };
  },
});

export const sendEmailTool = tool({
  description: "Gửi email",
  parameters: z.object({
    to: z.string().describe("Địa chỉ email người nhận"),
    subject: z.string().describe("Tiêu đề email"),
    body: z.string().describe("Nội dung email"),
  }),
  execute: async ({ to, subject, body }) => {
    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error("Địa chỉ email không hợp lệ");
    }

    // Sử dụng Mailjet API
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64')}`
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: 'office@tdn-m.com', Name: 'TDNM Assistant' },
          To: [{ Email: to }],
          Subject: subject,
          TextPart: body,
          HTMLPart: `<p>${body.replace(/\n/g, '<br>')}</p>`
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gửi email thất bại: ${errorData.Messages?.[0]?.Errors?.[0]?.ErrorMessage || 'Unknown error'}`);
    }

    return { 
      success: true, 
      message: "Email đã được gửi thành công",
      details: {
        timestamp: new Date().toISOString(),
        recipient: to
      }
    };
  },
});

export const createFileTool = tool({
  description: "Tạo file với các định dạng khác nhau",
  parameters: z.object({
    fileName: z.string().describe("Tên file"),
    content: z.string().describe("Nội dung file"),
    fileType: z.enum(['txt', 'pdf', 'csv', 'json', 'docx']).describe("Loại file (txt, pdf, csv, json, docx)"),
  }),
  execute: async ({ fileName, content, fileType }) => {
    if (!fileName || fileName.trim().length === 0) {
      throw new Error("Tên file không được để trống");
    }

    switch (fileType) {
      case 'pdf':
        const doc = new PDFDocument();
        const stream = doc.pipe(blobStream());
        doc.fontSize(12).text(content);
        doc.end();

        return new Promise((resolve) => {
          stream.on('finish', () => {
            const blob = stream.toBlob('application/pdf');
            const url = URL.createObjectURL(blob);
            resolve({
              success: true,
              fileName: `${fileName}.pdf`,
              fileUrl: url,
              message: "File PDF đã được tạo thành công"
            });
          });
        });

      // ... các case khác giữ nguyên ...
      default:
        throw new Error("Loại file không được hỗ trợ");
    }
  },
});

export const createChartTool = tool({
  description: "Tạo biểu đồ từ dữ liệu",
  parameters: z.object({
    chartType: z.enum(['line', 'bar', 'pie']).describe("Loại biểu đồ"),
    data: z.array(z.object({
      label: z.string(),
      value: z.number()
    })).describe("Dữ liệu cho biểu đồ"),
    title: z.string().optional().describe("Tiêu đề biểu đồ"),
  }),
  execute: async ({ chartType, data, title }) => {
    // Tạo canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Không thể tạo biểu đồ");

    // Tạo biểu đồ
    new Chart(ctx, {
      type: chartType,
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: title || 'Biểu đồ',
          data: data.map(d => d.value),
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: !!title,
            text: title
          }
        }
      }
    });

    // Chuyển đổi thành URL hình ảnh
    const imageUrl = canvas.toDataURL('image/png');
    return {
      success: true,
      chartUrl: imageUrl,
      message: `Biểu đồ ${chartType} đã được tạo thành công`
    };
  },
});

export const searchTool = tool({
  description: "Tìm kiếm thông tin trên web",
  parameters: z.object({
    query: z.string().describe("Từ khóa tìm kiếm"),
    limit: z.number().optional().describe("Số lượng kết quả tối đa"),
  }),
  execute: async ({ query, limit = 5 }) => {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CSE_ID}&num=${limit}`
    );

    if (!response.ok) {
      throw new Error("Tìm kiếm thất bại");
    }

    const data = await response.json();
    return {
      success: true,
      results: data.items?.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
      })) || [],
      message: `Tìm thấy ${data.items?.length || 0} kết quả cho "${query}"`
    };
  },
});

export const scheduleMeetingTool = tool({
  description: "Tạo và quản lý lịch họp",
  parameters: z.object({
    title: z.string().describe("Tiêu đề cuộc họp"),
    participants: z.array(z.string()).describe("Danh sách email người tham gia"),
    startTime: z.string().describe("Thời gian bắt đầu (ISO format)"),
    duration: z.number().describe("Thời lượng cuộc họp (phút)"),
    agenda: z.string().optional().describe("Nội dung chính của cuộc họp"),
  }),
  execute: async ({ title, participants, startTime, duration, agenda }) => {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);

    // Kiểm tra thời gian hợp lệ
    if (start < new Date()) {
      throw new Error("Thời gian bắt đầu phải trong tương lai");
    }

    // Tạo sự kiện trên Google Calendar
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GOOGLE_CALENDAR_TOKEN}`
      },
      body: JSON.stringify({
        summary: title,
        description: agenda,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: participants.map(email => ({ email })),
        reminders: {
          useDefault: true
        }
      })
    });

    if (!response.ok) {
      throw new Error("Tạo cuộc họp thất bại");
    }

    const event = await response.json();
    return {
      success: true,
      event,
      message: `Cuộc họp "${title}" đã được lên lịch thành công`
    };
  },
});