import React from 'react';

/**
 * Fixed shell: `top: 0` + `paddingTop: env(safe-area-inset-top)` paints `#F5F5F5` under the notch
 * (no viewport gap when scrolling). Logo row stays `h-[60px]`. Content clears `var(--app-header-offset)`.
 */
export function AppHeader() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-[100] flex w-full flex-col bg-[#F5F5F5]"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div className="mx-auto flex h-[60px] w-full max-w-[700px] shrink-0 items-center justify-center px-4">
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
