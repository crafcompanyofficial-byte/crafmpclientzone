import React from 'react';

/** Fixed shell header: below notch / Telegram chrome; content uses `pt-[60px]` + body safe-area padding. */
export function AppHeader() {
  return (
    <header
      className="fixed left-0 right-0 z-50 flex h-[60px] items-center justify-center bg-[#F5F5F5]"
      style={{ top: 'var(--safe-area-top)' }}
    >
      <div className="mx-auto flex h-full w-full max-w-[700px] shrink-0 items-center justify-center px-4">
        <img
          src={`${import.meta.env.BASE_URL}craf-logo.svg`}
          alt="CRAF"
          className="h-[47px] w-auto shrink-0 object-contain select-none"
          draggable={false}
        />
      </div>
    </header>
  );
}
