function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium min-w-[260px] animate-slideUp
            ${t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-blue-600"}`}
        >
          <i className={`bi text-base ${
            t.type === "success" ? "bi-check-circle-fill" :
            t.type === "error"   ? "bi-x-circle-fill"    : "bi-info-circle-fill"
          }`} />
          <span className="flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100 transition-opacity">
            <i className="bi bi-x" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;