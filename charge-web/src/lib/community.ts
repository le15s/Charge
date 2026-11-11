export const ROOMS = [
  { id: "feedback", title: "Website feedback", blurb: "Ideas, bugs and things you'd like to see in Charge.", tone: "red", hint: "What would make Charge better?" },
  { id: "questions", title: "Questions", blurb: "Ask about the site, a lift, a plan or your food.", tone: "blue", hint: "Ask your question…" },
  { id: "tips", title: "Tips and tricks", blurb: "Share what works, for the gym and for using the site.", tone: "yellow", hint: "Share a tip…" },
  { id: "lounge", title: "Lounge", blurb: "Chat with other lifters about anything.", tone: "green", hint: "Say something…" },
] as const;
export type RoomId = (typeof ROOMS)[number]["id"];
export const roomById = (id: string) => ROOMS.find((r) => r.id === id);
export const MAX_POST = 800;
