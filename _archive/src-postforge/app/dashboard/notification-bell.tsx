"use client";

import type { Prisma } from "@prisma/client";

type NotificationRow = Prisma.NotificationGetPayload<Record<string, never>>;

export default function NotificationBell({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="group relative">
      <button
        type="button"
        className="relative rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
        aria-label="Notifications"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      <div
        className="invisible absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 opacity-0 shadow-2xl transition-all duration-150 group-hover:visible group-hover:opacity-100"
        role="menu"
      >
        <div className="border-b border-zinc-800 p-3">
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
          {unread > 0 ? (
            <p className="text-xs text-zinc-500">{unread} unread</p>
          ) : null}
        </div>
        <div className="max-h-60 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-zinc-500">
              All caught up!
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`border-b border-zinc-800 p-3 last:border-b-0 ${!n.read ? "bg-zinc-800/40" : ""}`}
              >
                <p className="text-sm font-medium text-white">{n.title}</p>
                <p className="mt-1 text-xs text-zinc-400">{n.body}</p>
                <p className="mt-1 text-[10px] text-zinc-600">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
