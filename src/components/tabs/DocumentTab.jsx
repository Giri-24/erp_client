export default function DocumentTab({ next, back }) {

  const MAX_FILE_SIZE = 1024 * 1024; // 1MB

  const handleSubmit = (e) => {
    e.preventDefault();

    const photoFile = e.target.photo.files[0];
    const aadharFile = e.target.aadhar.files[0];

    if (photoFile && photoFile.size > MAX_FILE_SIZE) {
      alert('Photo file too large. Maximum allowed size is 1MB.');
      return;
    }
    if (aadharFile && aadharFile.size > MAX_FILE_SIZE) {
      alert('Aadhar file too large. Maximum allowed size is 1MB.');
      return;
    }

    next({
      photo: photoFile,
      aadhar: aadharFile,
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