export default function ChatsHome() {
  return (
    <div className="card chat-wall flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-light text-5xl dark:bg-darkmode-light" aria-hidden>💬</div>
      <h2 className="h4 mb-1 italic">Your messages</h2>
      <p className="max-w-sm">Pick a chat on the left, or start a new one with a gym buddy or a group of up to 10 people.</p>
    </div>
  );
}
