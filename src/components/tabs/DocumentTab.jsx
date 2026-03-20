export default function DocumentTab({ next, back }) {
  const handleSubmit = (e) => {
    e.preventDefault();

    next({
      photo: e.target.photo.files[0],
      aadhar: e.target.aadhar.files[0],
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="title">Documents</h2>

      <input type="file" name="photo" className="file" />
      <input type="file" name="aadhar" className="file" />

      <div className="flex justify-between mt-4">
        <button type="button" onClick={back} className="btn-gray">
          Back
        </button>
        <button className="btn">Next</button>
      </div>
    </form>
  );
}