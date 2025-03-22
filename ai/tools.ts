import { tool } from "ai";
import { z } from "zod";
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { Chart } from 'chart.js';
import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream';

// Công cụ gửi email
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
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        throw new Error("Địa chỉ email không hợp lệ");
      }

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

// Công cụ tạo file
export const createFileTool = tool({
  description: "Tạo file với các định dạng khác nhau",
  parameters: z.object({
    fileName: z.string().describe("Tên file"),
    content: z.string().describe("Nội dung file"),
    fileType: z.enum(['txt', 'pdf', 'json', 'docx']).describe("Loại file (txt, pdf, json, docx)"),
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

      case 'docx':
        const docxDoc = new Document({
          sections: [{
            properties: {},
            children: [new Paragraph({ children: [new TextRun(content)] })]
          }]
        });
        const docxBuffer = await Packer.toBuffer(docxDoc);
        const docxBlob = new Blob([docxBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const docxUrl = URL.createObjectURL(docxBlob);
        return {
          success: true,
          fileName: `${fileName}.docx`,
          fileUrl: docxUrl,
          message: "File DOCX đã được tạo thành công"
        };

      case 'json':
        const jsonBlob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        return {
          success: true,
          fileName: `${fileName}.json`,
          fileUrl: jsonUrl,
          message: "File JSON đã được tạo thành công"
        };

      default:
        throw new Error("Loại file không được hỗ trợ");
    }
  },
});

// Công cụ tạo biểu đồ
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
      message: `Biểu đồ ${title || ''} đã được tạo thành công`
    };
  },
});

// Công cụ lên lịch họp
export const scheduleMeetingTool = tool({
  description: "Lên lịch họp",
  parameters: z.object({
    title: z.string().describe("Tiêu đề cuộc họp"),
    participants: z.array(z.string()).describe("Danh sách người tham gia"),
    time: z.string().describe("Thời gian họp (định dạng ISO)"),
  }),
  execute: async ({ title, participants, time }) => {
    try {
      const meetingTime = new Date(time);
      if (isNaN(meetingTime.getTime())) {
        throw new Error("Thời gian không hợp lệ");
      }

      if (participants.length === 0) {
        throw new Error("Danh sách người tham gia không được để trống");
      }

      // Thêm logic lên lịch họp thực tế ở đây
      // Ví dụ: tích hợp với Google Calendar, Outlook, etc.

      return {
        success: true,
        message: `Cuộc họp "${title}" đã được lên lịch thành công`,
        details: {
          time: meetingTime.toISOString(),
          participants,
        }
      };
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      throw new Error(`Lỗi khi lên lịch họp: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});