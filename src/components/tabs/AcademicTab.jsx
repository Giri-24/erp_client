export default function AcademicTab({ next, back }) {
  const handleSubmit = (e) => {
    e.preventDefault();

    next({
      exam: e.target.exam.value,
      marks: e.target.marks.value,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="title">Academic Details</h2>

      <input name="exam" placeholder="Exam Name" className="input" />
      <input name="marks" placeholder="Marks %" className="input" />

      <div className="flex justify-between mt-4">
        <button type="button" onClick={back} className="btn-gray">
          Back
        </button>
        <button className="btn">Next</button>
      </div>
    </form>
  );
}