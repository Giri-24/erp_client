/**
 * Export student data in the provided PDF format (with header, logo, tables, and styled sections)
 * @param {Object} data - Student data object
 * @param {string} filename - The filename for the PDF
 * @param {string} [logoBase64] - Optional base64 string for the logo image
 */
export function exportStudentPdfFormatted(data, filename = "Student_Application.pdf", logoBase64) {
  const doc = new jsPDF('p', 'mm', 'a4');
  // Header
  doc.setFillColor(242, 153, 39); // Orange
  doc.rect(0, 0, 210, 30, 'F');
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 10, 5, 20, 20);
  } else {
    // Placeholder circle for logo
    doc.setFillColor(255,255,255);
    doc.circle(20, 15, 10, 'F');
    doc.setTextColor(0, 128, 0);
    doc.setFontSize(12);
    doc.text('PSF', 16, 18);
  }
  doc.setTextColor(255,255,255);
  doc.setFontSize(18);
  doc.text('MATRIC HR SEC SCHOOL', 40, 15);
  doc.setFontSize(10);
  doc.text('Excellence in Education - Vaduvapatty, Salem', 40, 22);

  let y = 35;
  doc.setTextColor(0,0,0);
  doc.setFontSize(12);
  // Student/Parent Details
  doc.text(`Student's Name : `, 15, y);
  doc.text(data.studentName || '', 60, y);
  doc.text(`Father's Name : `, 120, y);
  doc.text(data.fatherName || '', 160, y);
  y += 8;
  doc.text(`Mother's Name : `, 15, y);
  doc.text(data.motherName || '', 60, y);
  y += 8;
  doc.text(`Birth Date : `, 15, y);
  doc.text(data.birthDate || '', 45, y);
  doc.text(`Gender : `, 120, y);
  doc.text(data.gender || '', 140, y);
  y += 8;

  // Address Section
  doc.setFillColor(242, 153, 39);
  doc.setTextColor(255,255,255);
  doc.rect(15, y-5, 40, 7, 'F');
  doc.text('RESIDENTIAL ADDRESS', 17, y);
  doc.setTextColor(0,0,0);
  y += 7;
  doc.text('Address Line 1 : ', 15, y);
  doc.text(data.addressLine1 || '', 55, y);
  y += 7;
  doc.text('City : ', 15, y);
  doc.text(data.city || '', 30, y);
  doc.text('Pincode : ', 120, y);
  doc.text(data.pincode || '', 145, y);
  y += 7;
  doc.text('Religion : ', 15, y);
  doc.text(data.religion || '', 40, y);
  doc.text('Nationality : ', 120, y);
  doc.text(data.nationality || '', 150, y);
  y += 10;

  // Academic Performance
  doc.setTextColor(242, 153, 39);
  doc.setFontSize(12);
  doc.text('III. ACADEMIC PERFORMANCE', 15, y);
  doc.setTextColor(0,0,0);
  y += 7;
  doc.setFontSize(10);
  doc.text('Exam : ', 15, y);
  doc.text(data.exam || '', 32, y);
  doc.text('Reg No : ', 70, y);
  doc.text(data.regNo || '', 90, y);
  doc.text('Year : ', 140, y);
  doc.text(data.examYear || '', 155, y);
  y += 3;

  // Academic Table
  doc.autoTable({
    startY: y+2,
    head: [["SUBJECT", "MAX MARKS", "MARKS OBTAINED", "PERCENTAGE"]],
    body: (data.academicTable || []).map(row => [row.subject, row.maxMarks, row.marksObtained, row.percentage]),
    theme: 'grid',
    headStyles: { fillColor: [242, 153, 39], textColor: 0, fontStyle: 'bold' },
    styles: { fontSize: 10, halign: 'center' },
    margin: { left: 15, right: 15 },
    tableWidth: 180,
  });
  y = doc.lastAutoTable.finalY + 5;

  // Other Details (two columns)
  doc.setFontSize(11);
  doc.text('Phone Number :', 15, y);
  doc.text(data.phone || '', 50, y);
  doc.text('Email Address :', 120, y);
  doc.text(data.email || '', 160, y);
  y += 7;
  doc.text('Aadhar Number :', 15, y);
  doc.text(data.aadhar || '', 50, y);
  doc.text('Blood Group :', 120, y);
  doc.text(data.bloodGroup || '', 160, y);
  y += 7;
  doc.text('Admission For :', 15, y);
  doc.text(data.admissionFor || '', 50, y);
  doc.text('Section :', 120, y);
  doc.text(data.section || '', 140, y);
  doc.text('Academic Year :', 150, y);
  doc.text(data.academicYear || '', 180, y);
  y += 7;
  doc.text('Transport :', 15, y);
  doc.text(data.transport || '', 40, y);
  doc.text('RTE Student :', 120, y);
  doc.text(data.rteStudent || '', 150, y);
  y += 10;

  // Declaration
  doc.setFontSize(12);
  doc.setTextColor(33, 37, 107);
  doc.text('DECLARATION', 105, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(0,0,0);
  doc.text('I hereby, declaring that I will obey all the rules and regulations of the institution and be fully responsible for violating the rules.', 15, y, { maxWidth: 180 });
  y += 15;
  // Signature lines
  doc.line(30, y, 80, y);
  doc.line(130, y, 180, y);
  doc.text("Student's Signature", 40, y+6);
  doc.text("Authorized's Signature", 140, y+6);

  doc.save(filename);
}

import 'jspdf-autotable';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Export a DOM node as a PDF (used for student application review/export)
 * @param {HTMLElement} node - The DOM node to export
 * @param {string} filename - The filename for the PDF
 * @returns {Promise<void>}
 */
export async function exportNodeToPdf(node, filename = "Student_Application.pdf") {
  if (!node) return;
  // Wait for images to load
  const imgs = node.querySelectorAll("img");
  await Promise.all(Array.from(imgs).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(res => {
      img.onload = res;
      img.onerror = res;
    });
  }));
  const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#fff", windowWidth: node.offsetWidth });
  const imgWidth = 210, pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight, position = 0;
  const pdf = new jsPDF("p", "mm", "a4");
  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  pdf.save(filename);
}
