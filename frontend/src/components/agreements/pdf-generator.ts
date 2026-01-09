import jsPDF from "jspdf";
import { AgreementFormData } from "@/lib/types";

// Format currency for PDF (using PHP text instead of ₱ symbol to avoid jsPDF rendering issues)
function formatCurrencyForPDF(amount: number): string {
  const formatted = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `PHP ${formatted}`;
}

// Helper to convert number to words (for contract amount)
function numberToWords(num: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  if (num === 0) return "Zero";

  function convertLessThanThousand(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "");
  }

  const billion = Math.floor(num / 1000000000);
  const million = Math.floor((num % 1000000000) / 1000000);
  const thousand = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  let result = "";
  if (billion) result += convertLessThanThousand(billion) + " Billion ";
  if (million) result += convertLessThanThousand(million) + " Million ";
  if (thousand) result += convertLessThanThousand(thousand) + " Thousand ";
  if (remainder) result += convertLessThanThousand(remainder);

  return result.trim() + " Pesos Only";
}

function formatDateLong(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function generateAgreementPDF(data: AgreementFormData): GeneratedPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 25;
  const marginRight = 25;
  const marginTop = 20;
  const marginBottom = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = marginTop;

  // Check if we need a new page
  function checkPageBreak(requiredSpace: number) {
    if (y + requiredSpace > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  }

  // Add paragraph text with proper wrapping
  function addParagraph(text: string, fontSize: number = 11, isBold: boolean = false, indent: number = 0) {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");

    const effectiveWidth = contentWidth - indent;
    const lines = doc.splitTextToSize(text, effectiveWidth);
    const lineHeight = fontSize * 0.45;

    for (const line of lines) {
      checkPageBreak(lineHeight + 2);
      doc.text(line, marginLeft + indent, y);
      y += lineHeight;
    }
  }

  // Add section title
  function addSectionTitle(text: string) {
    checkPageBreak(15);
    y += 3;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 6;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(text, marginLeft, y);
    y += 6;
  }

  // Add subsection title
  function addSubsectionTitle(text: string) {
    checkPageBreak(10);
    y += 2;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(text, marginLeft, y);
    y += 5;
  }

  // Add bullet point
  function addBullet(text: string, indent: number = 8) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    const bulletX = marginLeft + indent;
    const textX = bulletX + 5;
    const effectiveWidth = contentWidth - indent - 5;
    const lines = doc.splitTextToSize(text, effectiveWidth);
    const lineHeight = 11 * 0.45;

    checkPageBreak(lines.length * lineHeight + 2);

    // Draw bullet
    doc.text("\u2022", bulletX, y);

    // Draw text
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], textX, y);
      if (i < lines.length - 1) y += lineHeight;
    }
    y += lineHeight;
  }

  // Add numbered item
  function addNumberedItem(number: string, text: string, indent: number = 8) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    const numX = marginLeft + indent;
    const textX = numX + 8;
    const effectiveWidth = contentWidth - indent - 8;
    const lines = doc.splitTextToSize(text, effectiveWidth);
    const lineHeight = 11 * 0.45;

    checkPageBreak(lines.length * lineHeight + 2);

    doc.text(number, numX, y);

    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], textX, y);
      if (i < lines.length - 1) y += lineHeight;
    }
    y += lineHeight;
  }

  // Add spacer
  function addSpacer(height: number = 4) {
    y += height;
  }

  // Project name
  const systemTypeLabel = data.systemType === "hybrid" ? "Hybrid" : "Grid Tied";
  const batteryInfo = data.batteryCapacity ? ` with ${data.batteryCapacity}kWh Battery` : "";
  const projectName = `Installation of a ${data.systemSize}kW ${systemTypeLabel} Solar Power System${batteryInfo}`;

  // ===== TITLE =====
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const title = "AGREEMENT FOR PHOTOVOLTAIC SYSTEM INSTALLATION PROJECT";
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, y);
  y += 12;

  // ===== PREAMBLE =====
  addParagraph(
    `This Agreement for Solar Power Project (the "Agreement") is made and entered into ${formatDateLong(data.agreementDate) || "[Date]"} by and between:`
  );
  addSpacer(4);

  addParagraph(
    `SALINAS SOLAR ENTERPRISES CORPORATION, a duly registered company in the Philippines, with office address at Roman Superhighway, Brgy. Bilolo, Orion, Bataan, represented by Mr. Jay-R Garado Salinas, hereinafter referred to as the "Contractor",`
  );
  addSpacer(4);

  addParagraph(
    `${data.clientName.toUpperCase()}, with address at ${data.clientAddress}, hereinafter referred to as the "Client".`
  );
  addSpacer(4);

  addParagraph(
    "WHEREAS, the Contractor is engaged in the design, supply, and installation of photovoltaic (PV) solar power systems;"
  );
  addSpacer(2);

  addParagraph(
    "WHEREAS, the Client desires to procure the Contractor's services for the supply and installation of a solar power system at the Client's specified location;"
  );
  addSpacer(2);

  addParagraph(
    "NOW, THEREFORE, in consideration of the mutual covenants herein contained, the parties agree as follows:"
  );

  // ===== 1. PROJECT DETAILS =====
  addSectionTitle("1. PROJECT DETAILS");
  addBullet(`Project Name: ${projectName}`);
  addBullet(`Project Location: ${data.projectLocation}`);
  addBullet("Project Description: The Contractor shall design, supply, install, test, and commission a solar power system.");

  // ===== 2. CONTRACT AMOUNT =====
  addSectionTitle("2. CONTRACT AMOUNT");
  const amountInWords = numberToWords(Math.floor(data.totalAmount));
  addParagraph(
    `The total project cost is ${formatCurrencyForPDF(data.totalAmount)} (${amountInWords}), inclusive of all materials, mobilization, and installation.`
  );

  // ===== 3. SCOPE OF WORK =====
  addSectionTitle("3. SCOPE OF WORK");
  addParagraph("The contractor shall be responsible for the following:");
  addSpacer(2);

  // 3.1 Site Assessment
  addSubsectionTitle("3.1 Site Assessment");
  addBullet("Conduct preliminary evaluation of the installation site, including structural integrity assessment of the rooftop.");
  addBullet("Perform shading analysis to optimize solar panel placement.");
  addBullet("Assess electrical infrastructure compatibility with the solar system.");

  // 3.2 Construction
  addSubsectionTitle("3.2 Construction of Solar Rooftop Power System");
  addBullet("Supply and installation of necessary materials.");
  addBullet("Proper mounting and secure installation of the solar panels, inverter, and protection devices.");

  // 3.3 Civil Works
  addSubsectionTitle("3.3 Civil Works");
  addBullet("Reinforcement and preparation of the roof structure to support the solar panels.");
  addBullet("Installation of weatherproofing measures to protect the system components.");

  // 3.4 Electrical Works
  addSubsectionTitle("3.4 Electrical Works");
  addBullet("Wiring and cabling works from the solar panels to the inverter and electrical panel.");
  addBullet("Installation of circuit breakers, protection devices, and grounding systems.");
  addBullet("Ensuring compliance with relevant electrical codes and safety regulations.");
  if (data.includeNetMetering) {
    addBullet("Net metering provision and application (excluding PENELCO fees and charges).");
  }

  // 3.5 Training
  addSubsectionTitle("3.5 Training to System Owner");
  addBullet("Provide a comprehensive orientation on system operation, monitoring, and basic troubleshooting.");
  addBullet("Guide the owner on energy consumption optimization and system maintenance.");

  // 3.6 Net Metering (if applicable)
  let sectionNum = 6;
  if (data.includeNetMetering) {
    addSubsectionTitle("3.6 Net Metering Provision and Application");
    addBullet("Service entrance modification.");
    addBullet("Processing and application of net metering (permit fees apply).");
    sectionNum = 7;
  }

  // 3.x Others
  if (data.includePanelCleaning || data.includeMaintenanceService) {
    addSubsectionTitle(`3.${sectionNum} Others`);
    if (data.includePanelCleaning) {
      addBullet("Free cleaning of solar panels for two (2) years; once a year.");
    }
    if (data.includeMaintenanceService) {
      addBullet("Bi-annual system evaluation performance report/maintenance service for fifteen (15) years.");
    }
  }

  // List of Materials
  addSpacer(4);
  addSubsectionTitle("List of Materials:");
  data.materials.forEach((material, index) => {
    if (material.name) {
      const specInfo = material.specifications ? ` ${material.specifications}` : "";
      const modelInfo = material.model ? ` ${material.model}` : "";
      addNumberedItem(`${index + 1}.`, `${material.name} - ${material.quantity} ${material.quantity > 1 ? "units" : "unit"}${modelInfo}${specInfo}`);
    }
  });

  // ===== 4. SCHEDULE OF PAYMENT =====
  addSectionTitle("4. SCHEDULE OF PAYMENT");
  data.payments.forEach((payment) => {
    if (payment.description) {
      let paymentText = `${payment.description}`;
      if (payment.amount > 0) {
        paymentText += ` - ${formatCurrencyForPDF(payment.amount)}`;
      }
      addParagraph(paymentText);
      if (payment.dueDate) {
        const formattedDate = formatDateLong(payment.dueDate);
        if (formattedDate) {
          addParagraph(`Due Date: ${formattedDate}`, 11, false, 8);
        }
      }
      addSpacer(2);
    }
  });
  addSpacer(2);
  addParagraph("Payments shall be made via cash, bank deposit or check payable to:");
  addParagraph("BPI Account: SALINAS SOLAR ENTERPRISES CORPORATION", 11, true);
  addParagraph("BPI Account No.: 2291-0004-98", 11, true);

  // ===== 5. COMMENCEMENT AND COMPLETION TIME =====
  addSectionTitle("5. COMMENCEMENT AND COMPLETION TIME");
  data.phases.forEach((phase, index) => {
    const phaseDate = formatDateLong(phase.date);
    const dateDisplay = phaseDate || "To Be Determined";
    addSubsectionTitle(`5.${index + 1} Phase ${index + 1} (${dateDisplay})`);
    phase.tasks.forEach((task) => {
      if (task.trim()) {
        addBullet(task);
      }
    });
  });

  // ===== 6. WARRANTY =====
  addSectionTitle("6. WARRANTY");
  addParagraph("The Contractor guarantees the following warranties:");
  addSpacer(2);

  let warrantyNum = 1;
  addNumberedItem(`${warrantyNum}.`, `Solar Panels: ${data.solarPanelWarranty} years performance warranty.`);
  warrantyNum++;
  addNumberedItem(`${warrantyNum}.`, `Inverter: ${data.inverterWarranty} years manufacturer warranty.`);
  warrantyNum++;
  if (data.systemType === "hybrid" && data.batteryCapacity) {
    addNumberedItem(`${warrantyNum}.`, `Battery: ${data.batteryWarranty} years manufacturer warranty.`);
    warrantyNum++;
  }
  addNumberedItem(`${warrantyNum}.`, `Mounting Structures and Installation Workmanship: ${data.mountingWarranty} year warranty against defects.`);

  addSpacer(2);
  addParagraph(
    "Warranty covers repair or replacement of defective items due to manufacturing defects, improper installation, and force majeure excluding damage due to misuse by the Client."
  );

  // ===== 7. OBLIGATIONS OF THE CLIENT =====
  addSectionTitle("7. OBLIGATIONS OF THE CLIENT");
  addParagraph("The Client agrees to:");
  addNumberedItem("1.", "Provide access to the project site for installation and inspection.");
  addNumberedItem("2.", "Ensure timely payment as per the terms of this contract.");
  addParagraph("a. Penalty fee of 8% of the total system price for every week of delayed payment from the due date.", 11, false, 16);

  // ===== 8. TERMINATION =====
  addSectionTitle("8. TERMINATION");
  addParagraph(
    "Either party may terminate this contract with a written notice within 5 (five) days. In case of termination:"
  );
  addBullet("Any materials delivered and installed remain the property of the Contractor until full payment.");
  addBullet("The Client is liable for payment of completed work and procured materials.");

  // ===== 9. FORCE MAJEURE =====
  addSectionTitle("9. FORCE MAJEURE");
  addParagraph(
    "The Contractor shall not be held liable for delays or failure to perform due to circumstances beyond its control, including natural disasters, labor strikes, or government restrictions."
  );

  // ===== 10. ENTIRE AGREEMENT =====
  addSectionTitle("10. ENTIRE AGREEMENT");
  addParagraph(
    "This contract constitutes the entire agreement between the Contractor and the Client, superseding any prior agreements or understandings."
  );

  // ===== 11. GOVERNING LAW =====
  addSectionTitle("11. GOVERNING LAW");
  addParagraph(
    "This contract shall be governed by and construed in accordance with the laws of the Republic of the Philippines."
  );

  // ===== SIGNATURE SECTION =====
  checkPageBreak(90);
  addSpacer(8);
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  addParagraph(
    "IN WITNESS WHEREOF, the parties hereto have executed this contract as of the date first written above.",
    11,
    true
  );
  addSpacer(10);

  // Two-column signature layout
  const colWidth = (contentWidth - 20) / 2;
  const leftCol = marginLeft;
  const rightCol = marginLeft + colWidth + 20;
  const signatureStartY = y;

  // Left column - Contractor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FOR THE CONTRACTOR:", leftCol, y);
  y += 5;
  doc.text("SALINAS SOLAR ENTERPRISES CORPORATION", leftCol, y);
  y += 20;

  // Signature line
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(leftCol, y, leftCol + colWidth - 10, y);
  y += 5;
  doc.text("Engr. Jay-R G. Salinas, ME, CEM", leftCol, y);
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Authorized Representative", leftCol, y);
  doc.setTextColor(0);
  y += 10;
  doc.setFontSize(11);
  doc.text("Date: ____________________", leftCol, y);

  // Right column - Client (start from same Y position)
  let rightY = signatureStartY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FOR THE CLIENT:", rightCol, rightY);
  rightY += 5;
  doc.text(data.clientName.toUpperCase(), rightCol, rightY);
  rightY += 20;

  // Signature line
  doc.setFont("helvetica", "normal");
  doc.line(rightCol, rightY, rightCol + colWidth - 10, rightY);
  rightY += 5;
  doc.text(data.clientName, rightCol, rightY);
  rightY += 5;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Client / Property Owner", rightCol, rightY);
  doc.setTextColor(0);
  rightY += 10;
  doc.setFontSize(11);
  doc.text("Date: ____________________", rightCol, rightY);

  // Move Y to after both columns
  y = Math.max(y, rightY) + 10;

  // Generate filename
  const sanitizedName = data.clientName.replace(/[^a-zA-Z0-9]/g, "_");
  const systemInfo = `${data.systemSize}kW_${systemTypeLabel}_System`;
  const filename = `${sanitizedName}_${systemInfo}.pdf`;

  // Return PDF blob and filename
  const pdfBlob = doc.output("blob");

  return {
    blob: pdfBlob,
    filename,
    download: () => doc.save(filename),
  };
}

// Type for the return value
export interface GeneratedPDF {
  blob: Blob;
  filename: string;
  download: () => void;
}
