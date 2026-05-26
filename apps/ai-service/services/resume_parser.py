"""
Resume Text Extraction Pipeline
- DOCX files → python-docx (clean text extraction)
- PDF files → PyMuPDF (fitz) primary, pdfplumber fallback
- TXT files → direct UTF-8 decode
"""
import io


def sanitize_text(text: str) -> str:
    """Remove null bytes and other characters that PostgreSQL rejects."""
    return text.replace("\x00", "").strip()


def extract_text_from_docx(raw_bytes: bytes) -> str:
    """Extract text from a DOCX file using python-docx."""
    from docx import Document
    doc = Document(io.BytesIO(raw_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return sanitize_text("\n".join(paragraphs))


def extract_text_from_pdf_fitz(raw_bytes: bytes) -> str:
    """Extract text from a PDF using PyMuPDF (fitz) — fast and reliable."""
    import fitz  # PyMuPDF
    doc = fitz.open(stream=raw_bytes, filetype="pdf")
    text_parts = []
    for page in doc:
        text_parts.append(page.get_text())
    doc.close()
    return sanitize_text("\n".join(text_parts))


def extract_text_from_pdf_plumber(raw_bytes: bytes) -> str:
    """Fallback: extract text from a PDF using pdfplumber."""
    import pdfplumber
    with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
        text_parts = []
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return sanitize_text("\n".join(text_parts))


def detect_file_type(raw_bytes: bytes, mime_type: str = "") -> str:
    """Detect file type from bytes magic number and mime type."""
    # Check magic bytes first (most reliable)
    if raw_bytes[:4] == b'%PDF':
        return "pdf"
    if raw_bytes[:2] == b'PK':  # DOCX is a ZIP archive
        return "docx"
    
    # Fallback to mime type
    mime_lower = mime_type.lower()
    if "pdf" in mime_lower:
        return "pdf"
    if "docx" in mime_lower or "openxmlformats" in mime_lower or "msword" in mime_lower:
        return "docx"
    if "text" in mime_lower:
        return "txt"
    
    return "unknown"


def extract_text(raw_bytes: bytes, mime_type: str = "") -> str:
    """
    Main extraction function — detects file type and uses the right parser.
    
    DOCX → python-docx (NEVER pdfplumber)
    PDF  → PyMuPDF primary, pdfplumber fallback
    TXT  → direct decode
    """
    file_type = detect_file_type(raw_bytes, mime_type)
    print(f"[PARSER] Detected file type: {file_type} (mime: {mime_type})")

    if file_type == "docx":
        try:
            text = extract_text_from_docx(raw_bytes)
            print(f"[PARSER] DOCX extraction: {len(text)} chars")
            if text:
                return text
        except Exception as e:
            print(f"[PARSER] DOCX extraction failed: {e}")

    elif file_type == "pdf":
        # Try PyMuPDF first
        try:
            text = extract_text_from_pdf_fitz(raw_bytes)
            print(f"[PARSER] PyMuPDF extraction: {len(text)} chars")
            if text:
                return text
        except Exception as e:
            print(f"[PARSER] PyMuPDF failed: {e}, trying pdfplumber...")

        # Fallback to pdfplumber
        try:
            text = extract_text_from_pdf_plumber(raw_bytes)
            print(f"[PARSER] pdfplumber extraction: {len(text)} chars")
            if text:
                return text
        except Exception as e:
            print(f"[PARSER] pdfplumber also failed: {e}")

    # Final fallback: treat as plain text
    try:
        text = sanitize_text(raw_bytes.decode("utf-8", errors="ignore"))
        print(f"[PARSER] Plain text fallback: {len(text)} chars")
        return text
    except Exception:
        return ""
