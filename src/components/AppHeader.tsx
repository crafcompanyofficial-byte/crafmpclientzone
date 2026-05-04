import React from 'react';

/** Fixed shell header: flat, centered CRAF logo. Content uses `MainLayout` `pt-[60px]`. */
export function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[60px] items-center justify-center bg-[#F5F5F5]">
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
