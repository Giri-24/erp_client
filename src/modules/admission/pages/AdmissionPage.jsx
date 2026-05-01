import AdmissionStepper from "../../../components/AdmissionStepper";

export default function AdmissionPage({ editData, clearEditData, onAfterUpdate }) {
  return (
      <AdmissionStepper editData={editData} clearEditData={clearEditData} onAfterUpdate={onAfterUpdate} />
  );
}