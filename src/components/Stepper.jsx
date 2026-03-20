export default function Stepper({ step }) {
  const steps = ["Student", "Documents", "Academic", "Review"];

  return (
    <div className="flex justify-between mb-8">
      {steps.map((label, index) => (
        <div key={index} className="flex-1 text-center">
          <div
            className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center 
            ${step >= index ? "bg-blue-600 text-white" : "bg-gray-300"}`}
          >
            {index + 1}
          </div>
          <p className="text-sm mt-2">{label}</p>
        </div>
      ))}
    </div>
  );
}