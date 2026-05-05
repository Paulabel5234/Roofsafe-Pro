/**
 * RoofSafe Pro — IIPP Document Generator
 * Fills contractor info into the IIPP template by replacing placeholders
 * in the .docx XML (docx files are ZIP archives containing XML).
 */

const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const TEMPLATE_PATH = path.join(__dirname, '..', 'toolbox-topics', 'IIPP_Template.docx');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * Generate a customized IIPP for a contractor.
 * @param {Object} contractor - Contractor data
 * @returns {string} - Filename of the generated IIPP
 */
function generateIIPP(contractor) {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error('IIPP template not found. Please ensure IIPP_Template.docx is in the toolbox-topics folder.');
  }

  const today = new Date();
  const effectiveDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reviewDate = new Date(today.setFullYear(today.getFullYear() + 1))
    .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Read the template ZIP
  const zip = new AdmZip(TEMPLATE_PATH);
  const zipEntries = zip.getEntries();

  // Replacements map
  const replacements = {
    '[Company Name]': contractor.company_name || '',
    '[DBA]': contractor.dba || contractor.company_name || '',
    '[Address]': contractor.address || '',
    '[City, State, Zip]': contractor.city_state_zip || '',
    '[Phone]': contractor.phone || '',
    '[CSLB License #]': contractor.cslb_license || '',
    '[IIPP Administrator]': contractor.iipp_admin || '',
    '[Effective Date]': effectiveDate,
    '[Review Date]': reviewDate,
    // Also replace XML-encoded versions
    '\\[Company Name\\]': contractor.company_name || '',
    'COMPANY NAME HERE': contractor.company_name || '',
  };

  zipEntries.forEach(entry => {
    if (entry.entryName.endsWith('.xml') || entry.entryName.endsWith('.rels')) {
      let content = zip.readAsText(entry);
      let modified = false;

      for (const [placeholder, value] of Object.entries(replacements)) {
        const regex = new RegExp(escapeRegex(placeholder), 'g');
        if (regex.test(content)) {
          content = content.replace(regex, xmlEscape(value));
          modified = true;
        }
      }

      // Also handle split XML runs (when a placeholder is broken across multiple <w:t> elements)
      content = replaceXmlSplitPlaceholders(content, replacements);

      if (modified) {
        zip.updateFile(entry.entryName, Buffer.from(content, 'utf8'));
      }
    }
  });

  // Save generated file
  const filename = `IIPP_${contractor.company_name.replace(/[^a-zA-Z0-9]/g, '_')}_${uuidv4().slice(0, 8)}.docx`;
  const outputPath = path.join(UPLOADS_DIR, filename);
  zip.writeZip(outputPath);

  return filename;
}

/**
 * Handle placeholders that get split across XML runs (common in Word docs).
 * Merges adjacent w:t elements before replacement.
 */
function replaceXmlSplitPlaceholders(content, replacements) {
  // Simple approach: collapse text runs around brackets
  // Replace </w:t></w:r><w:r><w:t> patterns to merge adjacent text
  let cleaned = content.replace(/<\/w:t><\/w:r>(\s*<w:r>(\s*<w:rPr>[^<]*<\/w:rPr>\s*)?<w:t[^>]*>)/g, '');

  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(escapeRegex(placeholder), 'g');
    cleaned = cleaned.replace(regex, xmlEscape(value));
  }
  return cleaned;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function xmlEscape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = { generateIIPP };
