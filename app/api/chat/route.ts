import { model, modelID } from "@/ai/providers";
import { weatherTool, sendEmailTool, createFileTool, scheduleMeetingTool, createChartTool, searchTool } from "@/ai/tools";
import { streamText, UIMessage } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    selectedModel,
  }: { messages: UIMessage[]; selectedModel: modelID } = await req.json();

  try {
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
- getWeather: Lấy thông tin thời tiết
- sendEmail: Gửi email
- createFile: Tạo file với các định dạng khác nhau
- scheduleMeeting: Lên lịch họp
- createChart: Tạo biểu đồ từ dữ liệu
- search: Tìm kiếm thông tin trên web

Hãy luôn đảm bảo rằng bạn đang cung cấp thông tin hữu ích và chính xác nhất có thể.`,
      messages,
      tools: {
        getWeather: weatherTool,
        sendEmail: sendEmailTool,
        createFile: createFileTool,
        scheduleMeeting: scheduleMeetingTool,
        createChart: createChartTool,
        search: searchTool
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
