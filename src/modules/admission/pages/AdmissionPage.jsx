import AdmissionStepper from "../../../components/AdmissionStepper";

export default function AdmissionPage({ editData, clearEditData }) {
  return (
      <AdmissionStepper editData={editData} clearEditData={clearEditData} />
  );
}