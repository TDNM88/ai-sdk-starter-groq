import NextLink from "next/link";

export const ProjectOverview = () => {
  return (
    <div className="flex flex-col items-center justify-end">
      <h1 className="text-3xl font-semibold mb-4">Vercel x Groq Chatbot</h1>
      <p className="text-center">
        Trợ lý AI <NextLink href="https://tdn-m.com/">@TDNM</NextLink>{" "}
      </p>
    </div>
  );
};
