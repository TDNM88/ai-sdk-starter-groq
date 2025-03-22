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

    const data = await response.json();
    
    if (!response.ok || data.cod === "404") {
      throw new Error(`Không tìm thấy thông tin thời tiết cho địa điểm "${location}"`);
    }

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
    if (!to || to.trim().length === 0) {
      throw new Error("Địa chỉ email người nhận không được để trống");
    }
    try {
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
            From: { Email: 'dung.ngt1988@gmail.com', Name: 'TDNM Assistant' },
            To: [{ Email: to }],
            Subject: subject,
            TextPart: body,
            HTMLPart: `<p>${body.replace(/\n/g, '<br>')}</p>`
          }]
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.Messages?.[0]?.Errors?.[0]?.ErrorMessage || 'Unknown error';
        throw new Error(`Gửi email thất bại: ${errorMessage}`);
      }

      return { 
        success: true, 
        message: "Email đã được gửi thành công",
        details: {
          timestamp: new Date().toISOString(),
          recipient: to,
          messageId: data.Messages?.[0]?.Status
        }
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Lỗi khi gửi email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      case 'txt':
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        return {
          success: true,
          fileName: `${fileName}.txt`,
          fileUrl: url,
          message: "File TXT đã được tạo thành công"
        };

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
    if (!data || data.length === 0) {
      throw new Error("Dữ liệu biểu đồ không được để trống");
    }
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
      message: `