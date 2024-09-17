const puppeteer = require("puppeteer");
const XLSX = require("xlsx");
const fs = require("fs");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to extract phone number with various formats
const extractPhoneNumber = (text) => {
  // Regex to capture phone numbers with various delimiters and formats
  const phoneNumberRegex = /\b\d{2}[.,\s]?\d{4}[\/\s-]?\d{4}\b/g;

  // Extract phone numbers
  const matches = text.match(phoneNumberRegex);

  if (matches) {
    // Extract the phone number after the "/"
    const afterSlash = text.split("/")[1] || "";

    // Find the first match in the part after "/"
    const afterSlashMatches = afterSlash.match(phoneNumberRegex);

    if (afterSlashMatches && afterSlashMatches.length > 0) {
      return afterSlashMatches[0].replace(/[.,\/-]/g, " ").trim();
    }

    // If no phone number found after "/", return the first match from the entire text
    return matches[0].replace(/[.,\/-]/g, " ").trim();
  }

  return "";
};

const removePhoneNumber = (text) => {
  // Regex to match phone numbers with various delimiters and formats
  const phoneNumberRegex = /\b\d{2}[.,\s]?\d{4}[\/\s-]?\d{4}\b/g;

  // Remove phone numbers before and after '/'
  const [beforeSlash, afterSlash] = text.split("/");

  // Process the part before '/'
  let cleanedText = beforeSlash.replace(phoneNumberRegex, "").trim();

  // Process the part after '/'
  const cleanedAfterSlash = (afterSlash || "")
    .replace(phoneNumberRegex, "")
    .trim();

  // Combine the parts and clean up multiple spaces
  cleanedText = `${cleanedText} ${cleanedAfterSlash}`
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleanedText;
};

(async () => {
  let codesSets = [];
  try {
    const data = fs.readFileSync("codes.json", "utf8");
    codesSets = JSON.parse(data);
  } catch (err) {
    console.error("Error reading codes.json:", err);
    return; // Exit if error reading codes
  }
  // Launch a new browser instance
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to the target website
  await page.goto("http://www.pecas-on-line.com.br/consultacod.php4");

  const allData = [];

  for (const codes of codesSets) {
    // Join codes with commas
    const codesString = codes.join(", ");

    // Type codes into the textarea
    await page.type('textarea[name="PartNumber"]', codesString);

    // Click the submit button
    await page.click('input[name="Pesquisar"]');

    // Wait for the page to load
    sleep(5000);

    // Wait for the table to load
    await page.waitForSelector(
      'table[border="0"][width="100%"][bgcolor="#FFFFFF"]'
    );

    // Extract table data
    const tableData = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll(
          'table[border="0"][width="100%"][bgcolor="#FFFFFF"] tr'
        )
      );
      return rows.slice(1).map((row) => {
        const cols = row.querySelectorAll("td");
        return Array.from(cols).map((col) => col.innerText.trim());
      });
    });

    // Process the extracted data
    const processedData = tableData.map((row) => {
      if (row.length > 0) {
        const fornecedor = row[2] || "";
        const telefone = extractPhoneNumber(fornecedor);
        const fornecedorWithoutPhone = removePhoneNumber(fornecedor);
        return [
          row[0] || "", // Fabricante
          row[1] || "", // Código
          fornecedorWithoutPhone, // Fornecedor
          telefone, // Telefone
          row[3] || "", // Qtd
          row[4] || "", // Preço
          row[5] || "", // Descrição
          row[6] || "", // Atualização
        ];
      }
      return [];
    });

    allData.push(...processedData); // Add the processed data to the list

    // Clear the textarea for the next set of codes
    await page.evaluate(() => {
      document.querySelector('textarea[name="PartNumber"]').value = "";
    });
  }

  // Close the browser
  await browser.close();

  // Prepare data for Excel
  const headers = [
    "Fabricante",
    "Código",
    "Fornecedor",
    "Telefone",
    "Qtd",
    "Preço",
    "Descrição",
    "Atualização",
  ];

  // Insert headers and data
  const worksheetData = [headers, ...allData];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  // Write data to Excel file
  XLSX.writeFile(workbook, "output.xlsx");

  console.log("Data has been written to 'output.xlsx'");
})();
