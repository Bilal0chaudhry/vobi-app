function safeFilename(job, ext) {
  const first = (job.patientFirstName || "Patient").replace(/[^a-zA-Z0-9_-]/g, "");
  const last = (job.patientLastName || "").replace(/[^a-zA-Z0-9_-]/g, "");
  const date = new Date(job.createdAt || Date.now()).toISOString().slice(0, 10);
  const name = [first, last].filter(Boolean).join("_") || "Patient";
  return `VOB_Summary_${name}_${date}.${ext}`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportSummaryToTxt(job, summary) {
  const s = summary || {};
  const cpts = Array.isArray(s.cptBreakdown) ? s.cptBreakdown : [];
  const notes = Array.isArray(s.notes) ? s.notes : [];

  const lines = [
    "======================================================================",
    "                VOBI — MEDICAL BENEFITS VERIFICATION SUMMARY          ",
    "======================================================================",
    "",
    `Patient Name      : ${job.patientFirstName || ""} ${job.patientLastName || ""}`.trim(),
    `Date of Birth     : ${job.dob || "Not provided"}`,
    `Insurance Payer   : ${job.insurance || "Not provided"}`,
    `Member ID         : ${job.memberId || "Not provided"}`,
    `Provider / Org    : ${job.providerOrgName || "Not provided"} (NPI: ${job.npi || "N/A"})`,
    `Verification Date : ${new Date(job.createdAt || Date.now()).toLocaleString()}`,
    `Call Reference #  : ${s.referenceNumber || "Not stated"}`,
    `Insurance Rep     : ${s.repName || "Not stated"}`,
    "",
    "----------------------------------------------------------------------",
    "1. EXECUTIVE OVERVIEW",
    "----------------------------------------------------------------------",
    s.headline || "Verification completed.",
    "",
    "----------------------------------------------------------------------",
    "2. ELIGIBILITY & PLAN NETWORK",
    "----------------------------------------------------------------------",
    `Eligibility Status : ${s.eligibilityStatus || "Not stated"}`,
    `Benefit Year       : ${s.benefitYear || "Not stated"}`,
    `Plan Type          : ${s.planType || "Not stated"}`,
    `Network Status     : ${s.networkStatus || "Not stated"}`,
    "",
    "----------------------------------------------------------------------",
    "3. FINANCIAL ACCUMULATORS",
    "----------------------------------------------------------------------",
    `Individual Deductible : ${s.deductibleIndividual || "Not stated"}`,
    `Deductible Remaining  : ${s.deductibleRemaining || "Not stated"}`,
    `Out-of-Pocket Max     : ${s.oopMaxIndividual || "Not stated"}`,
    `OOP Max Remaining     : ${s.oopMaxRemaining || "Not stated"}`,
    `Copay                 : ${s.copay || "Not stated"}`,
    `Coinsurance           : ${s.coinsurance || "Not stated"}`,
    "",
    "----------------------------------------------------------------------",
    "4. AUTHORIZATION, REFERRAL & BUY-AND-BILL",
    "----------------------------------------------------------------------",
    `Buy & Bill Allowed    : ${s.buyAndBill || "Not stated"}`,
    `Benefit Channel       : ${s.benefitChannel || "Not stated"}`,
    `PCP Referral Required : ${s.pcpReferralRequired || "Not stated"}`,
    `Prior Auth Required   : ${s.priorAuthRequired || "Not stated"}`,
    `Prior Auth Phone      : ${s.priorAuthPhone || "Not stated"}`,
    `Prior Auth Fax        : ${s.priorAuthFax || "Not stated"}`,
    `Preferred Formulary   : ${s.formularyPreferred || "Not stated"}`,
    "",
    "----------------------------------------------------------------------",
    "5. CPT / HCPCS CODE BREAKDOWN",
    "----------------------------------------------------------------------",
  ];

  if (cpts.length === 0) {
    lines.push("No specific CPT code details recorded.");
  } else {
    for (const item of cpts) {
      lines.push(
        `• Code ${item.code} (${item.description || "Procedure"}): ` +
          `Status=${item.covered || "Not stated"} | ` +
          `Allowed=${item.allowedAmount || "Not stated"} | ` +
          `Copay=${item.copay || "Not stated"} | ` +
          `Coinsurance=${item.coinsurance || "Not stated"} | ` +
          `Prior Auth=${item.priorAuthRequired || "Not stated"}`
      );
    }
  }

  if (notes.length > 0) {
    lines.push(
      "",
      "----------------------------------------------------------------------",
      "6. BILLING ACTION ITEMS & NOTES",
      "----------------------------------------------------------------------"
    );
    for (const note of notes) {
      lines.push(`• ${note}`);
    }
  }

  lines.push("", "======================================================================");
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, safeFilename(job, "txt"));
}

export async function exportSummaryToPdf(job, summary) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default || autoTableModule.autoTable;
  const s = summary || {};
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  // Header Banner
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 612, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("VOBI — Medical Benefits Verification Summary", 40, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    `Generated ${new Date(job.createdAt || Date.now()).toLocaleString()} · Ref # ${s.referenceNumber || "N/A"}`,
    40,
    50
  );

  let y = 84;
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Executive Summary", 40, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const splitHeadline = doc.splitTextToSize(
    s.headline || "Verification completed.",
    532
  );
  doc.text(splitHeadline, 40, y);
  y += splitHeadline.length * 13 + 10;

  // Patient & Plan Table
  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 9.5 },
    bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    head: [["Patient & Provider Details", "Value", "Eligibility & Network", "Value"]],
    body: [
      [
        "Patient Name",
        `${job.patientFirstName || ""} ${job.patientLastName || ""}`.trim(),
        "Eligibility Status",
        s.eligibilityStatus || "Not stated",
      ],
      ["Date of Birth", job.dob || "Not provided", "Plan Type", s.planType || "Not stated"],
      ["Insurance Payer", job.insurance || "Not provided", "Network Status", s.networkStatus || "Not stated"],
      ["Member ID", job.memberId || "Not provided", "Benefit Year", s.benefitYear || "Not stated"],
      [
        "Provider / NPI",
        `${job.providerOrgName || "Provider"} (${job.npi || "N/A"})`,
        "Rep / Ref #",
        `${s.repName || "N/A"} / ${s.referenceNumber || "N/A"}`,
      ],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Financials & Auth Table
  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    theme: "grid",
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 9.5 },
    bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    head: [["Financial Accumulators", "Amount", "Authorization & Pharmacy", "Status"]],
    body: [
      [
        "Individual Deductible",
        s.deductibleIndividual || "Not stated",
        "Buy & Bill Allowed",
        s.buyAndBill || "Not stated",
      ],
      [
        "Deductible Remaining",
        s.deductibleRemaining || "Not stated",
        "Benefit Channel",
        s.benefitChannel || "Not stated",
      ],
      [
        "Out-of-Pocket Max",
        s.oopMaxIndividual || "Not stated",
        "PCP Referral Required",
        s.pcpReferralRequired || "Not stated",
      ],
      [
        "OOP Max Remaining",
        s.oopMaxRemaining || "Not stated",
        "Prior Auth Required",
        s.priorAuthRequired || "Not stated",
      ],
      [
        "Copay / Coinsurance",
        `${s.copay || "Not stated"} / ${s.coinsurance || "Not stated"}`,
        "Preferred Formulary",
        s.formularyPreferred || "Not stated",
      ],
      [
        "Auth Dept Phone",
        s.priorAuthPhone || "Not stated",
        "Auth Dept Fax",
        s.priorAuthFax || "Not stated",
      ],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // CPT Code Breakdown Table
  const cpts = Array.isArray(s.cptBreakdown) ? s.cptBreakdown : [];
  if (cpts.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: 40, right: 40 },
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 9.5 },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
      head: [["CPT / HCPCS", "Description", "Coverage", "Allowed Amount", "Copay", "Coinsurance", "Prior Auth"]],
      body: cpts.map((item) => [
        item.code || "",
        item.description || "Procedure",
        item.covered || "Not stated",
        item.allowedAmount || "Not stated",
        item.copay || "Not stated",
        item.coinsurance || "Not stated",
        item.priorAuthRequired || "Not stated",
      ]),
    });
    y = doc.lastAutoTable.finalY + 16;
  }

  const notes = Array.isArray(s.notes) ? s.notes : [];
  if (notes.length > 0 && y < 720) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Billing Action Items & Call Notes", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const note of notes) {
      const wrapped = doc.splitTextToSize(`• ${note}`, 532);
      doc.text(wrapped, 40, y);
      y += wrapped.length * 12 + 3;
    }
  }

  doc.save(safeFilename(job, "pdf"));
}

export async function exportSummaryToDocx(job, summary) {
  const docx = await import("docx");
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    HeadingLevel,
    BorderStyle,
  } = docx;
  const s = summary || {};
  const cpts = Array.isArray(s.cptBreakdown) ? s.cptBreakdown : [];
  const notes = Array.isArray(s.notes) ? s.notes : [];

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
  };

  const makeRow = (cells, isHeader = false) =>
    new TableRow({
      children: cells.map(
        (text) =>
          new TableCell({
            borders: cellBorder,
            width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(text ?? "Not stated"),
                    bold: isHeader,
                    size: isHeader ? 20 : 19,
                  }),
                ],
              }),
            ],
          })
      ),
    });

  const children = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: "Vobi — Medical Benefits Verification Summary",
          bold: true,
          size: 30,
          color: "4F46E5",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Patient: ${job.patientFirstName || ""} ${job.patientLastName || ""} | Payer: ${job.insurance || ""} | Member ID: ${job.memberId || ""} | Ref #: ${s.referenceNumber || "Not stated"}`,
          size: 20,
          color: "475569",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "Executive Overview", bold: true, size: 24 })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: s.headline || "Verification completed.", size: 21 })],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "Eligibility, Network & Financials", bold: true, size: 24 })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        makeRow(["Field", "Verified Value", "Field", "Verified Value"], true),
        makeRow(["Eligibility Status", s.eligibilityStatus, "Plan Type", s.planType]),
        makeRow(["Network Status", s.networkStatus, "Benefit Year", s.benefitYear]),
        makeRow(["Individual Deductible", s.deductibleIndividual, "Deductible Remaining", s.deductibleRemaining]),
        makeRow(["Out-of-Pocket Max", s.oopMaxIndividual, "OOP Max Remaining", s.oopMaxRemaining]),
        makeRow(["Copay", s.copay, "Coinsurance", s.coinsurance]),
        makeRow(["Buy & Bill Allowed", s.buyAndBill, "Benefit Channel", s.benefitChannel]),
        makeRow(["PCP Referral Required", s.pcpReferralRequired, "Prior Auth Required", s.priorAuthRequired]),
        makeRow(["Prior Auth Phone", s.priorAuthPhone, "Prior Auth Fax", s.priorAuthFax]),
        makeRow(["Preferred Formulary", s.formularyPreferred, "Insurance Rep Name", s.repName]),
      ],
    }),
  ];

  if (cpts.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 240 },
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "CPT / HCPCS Code Breakdown", bold: true, size: 24 })],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          makeRow(["Code", "Description", "Covered", "Allowed Amount", "Copay", "Coinsurance", "Prior Auth"], true),
          ...cpts.map((item) =>
            makeRow([
              item.code,
              item.description || "Procedure",
              item.covered,
              item.allowedAmount,
              item.copay,
              item.coinsurance,
              item.priorAuthRequired,
            ])
          ),
        ],
      })
    );
  }

  if (notes.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 240 },
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Billing Action Items & Notes", bold: true, size: 24 })],
      }),
      ...notes.map(
        (note) =>
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: note, size: 20 })],
          })
      )
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, safeFilename(job, "docx"));
}

