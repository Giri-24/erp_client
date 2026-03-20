export default function StudentTab({ next }) {
  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      name: e.target.name.value,
      standard: e.target.standard.value,
      gender: e.target.gender.value,
    };

    next(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="title">Student Info</h2>

      <input name="name" placeholder="Name" className="input" />
      <input name="standard" placeholder="Standard" className="input" />

      <select name="gender" className="input">
        <option>Gender</option>
        <option value="MALE">Male</option>
        <option value="FEMALE">Female</option>
      </select>

      <button className="btn mt-4">Next</button>
    </form>
  );
}