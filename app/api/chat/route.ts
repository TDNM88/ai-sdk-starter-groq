import { model, modelID } from "@/ai/providers";
import { 
  sendEmailTool, 
  createFileTool, 
  scheduleMeetingTool, 
  createChartTool 
} from "@/ai/tools";
import { streamText } from "ai";
import fs from 'fs';
import path from 'path';
import os from 'os';
import { cleanupOldFiles } from '@/lib/utils';
// Khai báo biến selectedModel với kiểu dữ liệu modelID
const selectedModel: modelID = "deepseek-r1-distill-llama-70b";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  console.log('Received request');
  const formData = await req.formData();
  const message = formData.get('message') as string;
  const file = formData.get('file') as File | null;
  console.log('Message:', message);
  console.log('File:', file);

  try {
    let tempFilePath: string | null = null;
    
    if (file) {
      console.log('Processing file...');
      cleanupOldFiles();
      
      const tempDir = path.join(os.tmpdir(), 'tdnm-chat');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileBuffer = await file.arrayBuffer();
      tempFilePath = path.join(tempDir, file.name);
      fs.writeFileSync(tempFilePath, Buffer.from(fileBuffer));
      console.log('File saved at:', tempFilePath);
    }

    const result = streamText({
      model: model.languageModel(selectedModel),
      system: `Bạn là một trợ lý AI thông minh và hữu ích của TDNM. Nhiệm vụ của bạn là hỗ trợ người dùng với các công việc văn phòng và trả lời các câu hỏi một cách chính xác và thân thiện.

Hãy tuân thủ các nguyên tắc sau:
1. Luôn trả lời bằng tiếng Việt, trừ khi được yêu cầu cụ thể
2. Sử dụng ngôn ngữ lịch sự và chuyên nghiệp
3. Khi không chắc chắn về câu trả lời, hãy thẳng thắn thừa nhận
4. Sử dụng các công cụ có sẵn khi cần thiết để cung cấp thông tin chính xác
5. Đối với các yêu cầu phức tạp, hãy chia nhỏ thành các bước và giải thích từng bước một
6. Luôn kiểm tra tính hợp lệ của dữ liệu đầu vào trước khi xử lý

Các công cụ bạn có thể sử dụng:
- sendEmail: Gửi email
- createFile: Tạo file với các định dạng khác nhau
- scheduleMeeting: Lên lịch họp
- createChart: Tạo biểu đồ từ dữ liệu

Hãy luôn đảm bảo rằng bạn đang cung cấp thông tin hữu ích và chính xác nhất có thể.`,
      messages: [{ role: 'user', content: message }],
      tools: {
        sendEmail: sendEmailTool,
        createFile: createFileTool,
        scheduleMeeting: scheduleMeetingTool,
        createChart: createChartTool
      },
      experimental_telemetry: {
        isEnabled: true,
      },
    });

    return result.toDataStreamResponse({ sendReasoning: true });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
