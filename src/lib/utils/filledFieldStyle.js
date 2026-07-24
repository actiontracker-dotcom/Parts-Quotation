export function filledFieldStyle(hasValue, error = false) {
  if (error) return "border-danger-300 focus:ring-danger-400 bg-white";
  if (hasValue) {
    return "bg-slate-100 border-slate-400 text-black shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]";
  }
  return "bg-white border-gray-300 text-gray-900";
}
