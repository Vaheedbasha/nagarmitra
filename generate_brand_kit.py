import os
import subprocess
import base64
import shutil

icon_path = r"D:\CityFix\public\nagarmitra-icon.png"
with open(icon_path, "rb") as f:
    icon_b64 = base64.b64encode(f.read()).decode("utf-8")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NagarMitra Brand Kit</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800;900&display=swap');

    @page {{
      size: A4 portrait;
      margin: 0;
    }}

    * {{
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }}

    body {{
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }}

    .page {{
      width: 210mm;
      height: 297mm;
      position: relative;
      page-break-after: always;
      page-break-inside: avoid;
      overflow: hidden;
      padding: 38mm 24mm 26mm 24mm;
      background: #ffffff;
    }}

    /* Top Running Header */
    .page-header {{
      position: absolute;
      top: 14mm;
      left: 24mm;
      right: 24mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #94a3b8;
    }}

    /* Bottom Running Footer */
    .page-footer {{
      position: absolute;
      bottom: 12mm;
      left: 24mm;
      right: 24mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 3.5mm;
    }}

    /* Section Headings */
    h1.section-title {{
      font-family: 'Manrope', sans-serif;
      font-size: 24pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.03em;
      margin: 0 0 5mm 0;
      line-height: 1.15;
    }}

    h2.subsection-title {{
      font-family: 'Manrope', sans-serif;
      font-size: 13pt;
      font-weight: 800;
      color: #4338ca;
      letter-spacing: -0.01em;
      margin: 5.5mm 0 2mm 0;
      line-height: 1.25;
    }}

    p.lead-text {{
      font-size: 10pt;
      line-height: 1.55;
      color: #475569;
      margin: 0 0 4.5mm 0;
    }}

    p.body-text {{
      font-size: 9.5pt;
      line-height: 1.55;
      color: #475569;
      margin: 0 0 3mm 0;
    }}

    /* Grid & Cards */
    .grid-2col {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
    }}

    .grid-card {{
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 3mm;
      padding: 3.5mm 4mm;
    }}

    .grid-card-title {{
      font-family: 'Manrope', sans-serif;
      font-size: 10pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1.5mm;
    }}

    .grid-card-desc {{
      font-size: 8.5pt;
      line-height: 1.45;
      color: #64748b;
    }}

    /* Clean Tables */
    table.data-table {{
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid #e2e8f0;
      border-radius: 3mm;
      overflow: hidden;
      margin: 3.5mm 0;
    }}

    table.data-table th {{
      background: #4338ca;
      color: #ffffff;
      font-family: 'Manrope', sans-serif;
      font-size: 8.5pt;
      font-weight: 700;
      text-align: left;
      padding: 3mm 4mm;
      border: none;
    }}

    table.data-table td {{
      font-size: 8.5pt;
      line-height: 1.45;
      padding: 2.8mm 4mm;
      border-top: 1px solid #e2e8f0;
      color: #334155;
    }}

    table.data-table tr:nth-child(even) td {{
      background: #f8fafc;
    }}

    /* Page 1: Cover */
    .page-cover {{
      background: #0f172a;
      color: #ffffff;
      padding: 38mm 24mm 24mm 24mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }}

    .cover-top {{
      margin-top: 10mm;
    }}

    .cover-title {{
      font-family: 'Manrope', sans-serif;
      font-size: 38pt;
      font-weight: 900;
      letter-spacing: -0.03em;
      margin: 0;
      color: #ffffff;
    }}

    .cover-subtitle {{
      font-size: 10pt;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-top: 3.5mm;
    }}

    .cover-lead {{
      font-size: 13pt;
      line-height: 1.6;
      color: #cbd5e1;
      max-width: 140mm;
      margin-top: 18mm;
    }}

    .cover-logo-card {{
      background: #ffffff;
      border-radius: 4mm;
      padding: 7mm 10mm;
      display: inline-flex;
      align-items: center;
      gap: 5mm;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      margin-top: 18mm;
      align-self: flex-start;
    }}

    .cover-slogan {{
      font-family: 'Manrope', sans-serif;
      font-size: 16pt;
      font-weight: 800;
      color: #818cf8;
      letter-spacing: -0.01em;
      margin-bottom: 8mm;
    }}

    /* Page 2: Inside Cover */
    .inside-cover-box {{
      position: absolute;
      top: 38mm;
      left: 24mm;
      font-size: 9.5pt;
      font-weight: 500;
      color: #475569;
    }}

    /* Swatches on Page 6 */
    .swatch-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      margin: 4mm 0 6mm 0;
    }}

    .swatch-card {{
      border: 1px solid #e2e8f0;
      border-radius: 3mm;
      overflow: hidden;
      background: #ffffff;
    }}

    .swatch-color {{
      height: 24mm;
      width: 100%;
    }}

    .swatch-info {{
      padding: 3mm 4mm;
    }}

    .swatch-name {{
      font-family: 'Manrope', sans-serif;
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
    }}

    .swatch-hex {{
      font-family: monospace;
      font-size: 8.5pt;
      font-weight: 600;
      color: #64748b;
      margin: 0.8mm 0;
    }}

    .swatch-role {{
      font-size: 8pt;
      color: #94a3b8;
    }}

    /* Lists */
    ul.styled-list {{
      margin: 2mm 0 4mm 0;
      padding-left: 5mm;
    }}

    ul.styled-list li {{
      font-size: 9pt;
      line-height: 1.5;
      color: #475569;
      margin-bottom: 1.5mm;
    }}

    /* Logo lockups on Page 4 */
    .logo-sample-card {{
      border-radius: 3mm;
      padding: 5mm 8mm;
      margin-bottom: 3.5mm;
      display: flex;
      align-items: center;
      gap: 4.5mm;
    }}

    .logo-sample-light {{
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }}

    .logo-sample-dark {{
      background: #0f172a;
      border: 1px solid #1e293b;
    }}

    .logo-sample-mono {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }}

    .brand-wordmark {{
      font-family: 'Manrope', sans-serif;
      font-size: 26pt;
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1;
    }}

    /* Typography specimen container on Page 7 */
    .specimen-box {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 3mm;
      padding: 4mm 5mm;
      margin-bottom: 4mm;
    }}
  </style>
</head>
<body>

  <!-- ==================== PAGE 1: COVER ==================== -->
  <div class="page page-cover">
    <div class="cover-top">
      <h1 class="cover-title">NagarMitra</h1>
      <div class="cover-subtitle">BRAND KIT | BUILDATHON SUBMISSION</div>
      <p class="cover-lead">
        A civic platform built around people, place and public accountability.
      </p>

      <div class="cover-logo-card">
        <img src="data:image/png;base64,{icon_b64}" alt="Icon" style="width: 14mm; height: 14mm; border-radius: 3mm;">
        <span class="brand-wordmark" style="color: #261e58;">Nagar<span style="color: #f97316;">Mitra</span></span>
      </div>
    </div>

    <div class="cover-slogan">
      Your City. Your Voice. Our Responsibility.
    </div>
  </div>

  <!-- ==================== PAGE 2: INSIDE COVER ==================== -->
  <div class="page page-inside-cover">
    <div class="page-header">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>02</span>
    </div>

    <div class="inside-cover-box">
      Brand identity and visual direction • Version 2.0 (Production Verified) • November 2026
    </div>

    <div class="page-footer">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>02</span>
    </div>
  </div>

  <!-- ==================== PAGE 3: BRAND FOUNDATION ==================== -->
  <div class="page">
    <div class="page-header">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>03</span>
    </div>

    <h1 class="section-title">01 Brand foundation</h1>
    <p class="lead-text">
      NagarMitra combines two simple ideas: <strong>Nagar</strong> (city) and <strong>Mitra</strong> (friend). The brand stands for a civic companion that helps people make local problems visible, organise community voices and encourage public accountability.
    </p>

    <h2 class="subsection-title">Brand purpose</h2>
    <p class="body-text">
      To make civic issues easier to report, understand and bring into public view—so citizens and communities can participate in improving the places they live.
    </p>

    <h2 class="subsection-title">Mission</h2>
    <p class="body-text">
      Give citizens an accessible platform to report real-world civic problems, leverage automated multi-factor rule triage and verified civic assessment, and make issues visible to communities and relevant authorities.
    </p>

    <h2 class="subsection-title">Vision</h2>
    <p class="body-text">
      Cities where civic concerns are heard, information is transparent, and public accountability is strengthened through informed citizen participation.
    </p>

    <h2 class="subsection-title" style="margin-top: 4.5mm;">Brand values</h2>
    <div class="grid-2col">
      <div class="grid-card">
        <div class="grid-card-title">Trust</div>
        <div class="grid-card-desc">Respect people’s information and represent reports responsibly.</div>
      </div>
      <div class="grid-card">
        <div class="grid-card-title">Transparency</div>
        <div class="grid-card-desc">Make issue information clear, traceable and understandable.</div>
      </div>
      <div class="grid-card">
        <div class="grid-card-title">Community</div>
        <div class="grid-card-desc">Connect individual experiences with shared civic concerns.</div>
      </div>
      <div class="grid-card">
        <div class="grid-card-title">Responsibility</div>
        <div class="grid-card-desc">Prioritise accuracy, moderation and public interest.</div>
      </div>
      <div class="grid-card">
        <div class="grid-card-title">Accessibility</div>
        <div class="grid-card-desc">Make reporting understandable and usable by more people.</div>
      </div>
      <div class="grid-card">
        <div class="grid-card-title">Action</div>
        <div class="grid-card-desc">Help move concerns from visibility towards constructive follow-up.</div>
      </div>
    </div>

    <h2 class="subsection-title" style="margin-top: 4.5mm;">Brand personality</h2>
    <p class="body-text"><strong>Modern • Approachable • Trustworthy • Citizen-focused • Progressive</strong></p>

    <h2 class="subsection-title">Positioning statement</h2>
    <p class="body-text">
      NagarMitra is a civic intelligence and public accountability platform that helps citizens document local problems, provides automated municipal triage and verification, and brings structured issue data directly to municipal ward teams and the public.
    </p>

    <div class="page-footer">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>03</span>
    </div>
  </div>

  <!-- ==================== PAGE 4: LOGO SYSTEM ==================== -->
  <div class="page">
    <div class="page-header">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>04</span>
    </div>

    <h1 class="section-title">02 Logo system</h1>
    <p class="lead-text">
      The logo direction combines a human connection motif with a simplified city reference. The two human forms represent citizens and partnership; the city silhouette anchors the mark in neighbourhoods and public spaces. The horizontal wordmark is intended for website headers and formal brand use.
    </p>

    <div style="font-size: 9.5pt; font-weight: 700; color: #4338ca; margin-bottom: 2mm;">Primary horizontal logo — light background</div>
    <div class="logo-sample-card logo-sample-light">
      <img src="data:image/png;base64,{icon_b64}" alt="Icon" style="width: 14mm; height: 14mm; border-radius: 3mm;">
      <span class="brand-wordmark" style="color: #261e58;">Nagar<span style="color: #f97316;">Mitra</span></span>
    </div>

    <div style="font-size: 9.5pt; font-weight: 700; color: #4338ca; margin-bottom: 2mm;">Dark-background treatment</div>
    <div class="logo-sample-card logo-sample-dark">
      <img src="data:image/png;base64,{icon_b64}" alt="Icon" style="width: 14mm; height: 14mm; border-radius: 3mm;">
      <span class="brand-wordmark" style="color: #ffffff;">Nagar<span style="color: #f97316;">Mitra</span></span>
    </div>

    <div style="font-size: 9.5pt; font-weight: 700; color: #4338ca; margin-bottom: 2mm;">Monochrome treatment</div>
    <div class="logo-sample-card logo-sample-mono">
      <img src="data:image/png;base64,{icon_b64}" alt="Icon" style="width: 14mm; height: 14mm; border-radius: 3mm; filter: grayscale(100%) contrast(150%);">
      <span class="brand-wordmark" style="color: #111827;">Nagar<span style="color: #111827;">Mitra</span></span>
    </div>

    <h2 class="subsection-title" style="margin-top: 5mm;">Logo use rules</h2>
    <ul class="styled-list">
      <li>Keep the logo proportions intact; do not stretch or skew it.</li>
      <li>Maintain clear space around the mark at least equal to the height of the capital “N”.</li>
      <li>Use the light version on white or pale surfaces and the dark version on deep navy surfaces.</li>
      <li>Use the monochrome version when colour reproduction is unavailable.</li>
      <li>Do not add effects, outlines, shadows or extra taglines to the approved lockup.</li>
    </ul>

    <p style="font-size: 8pt; color: #94a3b8; line-height: 1.45; margin-top: 4mm;">
      Production note: Production vector artwork and SVG logos are deployed across the web application and brand touchpoints.
    </p>

    <div class="page-footer">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>04</span>
    </div>
  </div>

  <!-- ==================== PAGE 5: SOCIAL AND APP ICON ==================== -->
  <div class="page">
    <div class="page-header">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>05</span>
    </div>

    <h1 class="section-title">03 Social and app icon</h1>
    <p class="lead-text">
      The standalone symbol is designed for square placements such as social profile images, app tiles and browser favicons. It should be centred with safe padding so that platform-specific circular crops do not cut into the mark.
    </p>

    <div style="display: grid; grid-template-columns: 80mm 1fr; gap: 8mm; align-items: start; margin: 4mm 0 6mm 0;">
      <div style="text-align: center;">
        <img src="data:image/png;base64,{icon_b64}" alt="App Icon" style="width: 74mm; height: 74mm; border-radius: 14mm; box-shadow: 0 10px 25px rgba(0,0,0,0.12);">
      </div>
      <div>
        <div style="margin-bottom: 4.5mm;">
          <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin-bottom: 1mm;">Primary use</div>
          <div style="font-size: 9pt; color: #64748b; line-height: 1.45;">Social profile image, app icon and compact brand placement.</div>
        </div>
        <div style="margin-bottom: 4.5mm;">
          <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin-bottom: 1mm;">Background</div>
          <div style="font-size: 9pt; color: #64748b; line-height: 1.45;">White rounded-square field with a purple/blue/orange frame.</div>
        </div>
        <div>
          <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin-bottom: 1mm;">Do not</div>
          <div style="font-size: 9pt; color: #64748b; line-height: 1.45;">Add the wordmark or tagline inside the icon. Avoid cropping the symbol or placing text over it.</div>
        </div>
      </div>
    </div>

    <h2 class="subsection-title" style="margin-top: 4mm;">Recommended export sizes</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Placement</th>
          <th>Recommended size</th>
          <th>Format</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Social profile</strong></td>
          <td>1080 × 1080 px</td>
          <td>PNG</td>
        </tr>
        <tr>
          <td><strong>App icon master</strong></td>
          <td>1024 × 1024 px</td>
          <td>PNG</td>
        </tr>
        <tr>
          <td><strong>Website favicon</strong></td>
          <td>32 × 32 / 48 × 48 px</td>
          <td>PNG / ICO / SVG</td>
        </tr>
        <tr>
          <td><strong>High-resolution master</strong></td>
          <td>2048 × 2048 px</td>
          <td>PNG / SVG</td>
        </tr>
      </tbody>
    </table>

    <div class="page-footer">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>05</span>
    </div>
  </div>

  <!-- ==================== PAGE 6: COLOUR SYSTEM ==================== -->
  <div class="page">
    <div class="page-header">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>06</span>
    </div>

    <h1 class="section-title">04 Colour system</h1>
    <p class="lead-text">
      The palette is aligned with the existing NagarMitra interface direction. Indigo and purple carry the core identity; blue supports digital clarity; orange adds energy and highlights important actions. The colour values below are the proposed brand palette for this version.
    </p>

    <div class="swatch-grid">
      <div class="swatch-card">
        <div class="swatch-color" style="background: #4338CA;"></div>
        <div class="swatch-info">
          <div class="swatch-name">Indigo</div>
          <div class="swatch-hex">#4338CA</div>
          <div class="swatch-role">Primary brand colour</div>
        </div>
      </div>
      <div class="swatch-card">
        <div class="swatch-color" style="background: #7C3AED;"></div>
        <div class="swatch-info">
          <div class="swatch-name">Purple</div>
          <div class="swatch-hex">#7C3AED</div>
          <div class="swatch-role">Secondary brand colour</div>
        </div>
      </div>
      <div class="swatch-card">
        <div class="swatch-color" style="background: #2563EB;"></div>
        <div class="swatch-info">
          <div class="swatch-name">Blue</div>
          <div class="swatch-hex">#2563EB</div>
          <div class="swatch-role">Digital accent</div>
        </div>
      </div>
      <div class="swatch-card">
        <div class="swatch-color" style="background: #F59E0B;"></div>
        <div class="swatch-info">
          <div class="swatch-name">Orange</div>
          <div class="swatch-hex">#F59E0B</div>
          <div class="swatch-role">Highlight / call to action</div>
        </div>
      </div>
    </div>

    <h2 class="subsection-title" style="margin-top: 2mm;">Supporting interface colours</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Colour</th>
          <th>Hex</th>
          <th>Recommended role</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>White</strong></td>
          <td><code>#FFFFFF</code></td>
          <td>Primary light surfaces</td>
        </tr>
        <tr>
          <td><strong>Off-white</strong></td>
          <td><code>#F8FAFC</code></td>
          <td>Page backgrounds and cards</td>
        </tr>
        <tr>
          <td><strong>Dark charcoal</strong></td>
          <td><code>#111827</code></td>
          <td>Primary text and dark theme base</td>
        </tr>
        <tr>
          <td><strong>Slate grey</strong></td>
          <td><code>#64748B</code></td>
          <td>Secondary text and metadata</td>
        </tr>
        <tr>
          <td><strong>Border grey</strong></td>
          <td><code>#E2E8F0</code></td>
          <td>Dividers and subtle borders</td>
        </tr>
      </tbody>
    </table>

    <h2 class="subsection-title">Colour usage guidance</h2>
    <p class="body-text">
      Use indigo for primary brand actions and key headings. Purple and blue should support hierarchy, not compete for attention. Reserve orange for highlights, calls to action and important visual accents. Maintain accessible text contrast; do not use orange for long body text on white.
    </p>

    <div class="page-footer">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>06</span>
    </div>
  </div>

  <!-- ==================== PAGE 7: TYPOGRAPHY ==================== -->
  <div class="page">
    <div class="page-header">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>07</span>
    </div>

    <h1 class="section-title">05 Typography</h1>
    <p class="lead-text">
      Typography should feel clear, contemporary and accessible. The suggested pairing below is intended for both the website and brand communication. Confirm font licensing and load the chosen web fonts consistently across platforms.
    </p>

    <!-- Primary display typeface (Fixed text overlap glitch) -->
    <div style="font-size: 11pt; font-weight: 800; color: #4338ca; margin-bottom: 2mm;">Primary display typeface — Manrope</div>
    <div class="specimen-box">
      <div style="font-family: 'Manrope', sans-serif; font-size: 26pt; font-weight: 800; color: #0f172a; margin-bottom: 1.5mm;">
        NagarMitra
      </div>
      <div style="font-family: 'Manrope', sans-serif; font-size: 11pt; font-weight: 600; color: #334155; margin-bottom: 3.5mm;">
        Clear ideas. Strong communities. Better cities.
      </div>
      <div style="font-size: 8pt; color: #64748b; font-weight: 500; border-top: 1px solid #e2e8f0; padding-top: 2.5mm;">
        <strong>Recommended use:</strong> Brand headings, page titles, campaign headlines and statistics.
      </div>
    </div>

    <!-- Supporting typeface -->
    <div style="font-size: 11pt; font-weight: 800; color: #4338ca; margin-bottom: 2mm;">Supporting typeface — Inter</div>
    <div class="specimen-box">
      <div style="font-size: 9.5pt; line-height: 1.6; color: #334155; margin-bottom: 3mm;">
        Report a civic issue in your neighbourhood. Add a description, location and supporting evidence. NagarMitra helps organise the information so the concern can be understood and shared responsibly.
      </div>
      <div style="font-size: 8pt; color: #64748b; font-weight: 500; border-top: 1px solid #e2e8f0; padding-top: 2.5mm;">
        <strong>Recommended use:</strong> Body copy, interface labels, forms, notifications, captions and long-form content.
      </div>
    </div>

    <h2 class="subsection-title" style="margin-top: 3.5mm;">Typography hierarchy</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Style</th>
          <th>Suggested size</th>
          <th>Weight / use</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Display / H1</strong></td>
          <td>32–40 px</td>
          <td>Bold; major landing-page headline</td>
        </tr>
        <tr>
          <td><strong>H2</strong></td>
          <td>24–30 px</td>
          <td>Bold; section headings</td>
        </tr>
        <tr>
          <td><strong>H3</strong></td>
          <td>18–22 px</td>
          <td>Semibold; card and subsection titles</td>
        </tr>
        <tr>
          <td><strong>Body</strong></td>
          <td>15–17 px</td>
          <td>Regular; readable paragraphs</td>
        </tr>
        <tr>
          <td><strong>Caption / UI</strong></td>
          <td>12–14 px</td>
          <td>Medium; metadata and helper text</td>
        </tr>
      </tbody>
    </table>

    <div class="page-footer">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>07</span>
    </div>
  </div>

  <!-- ==================== PAGE 8: VISUAL LANGUAGE ==================== -->
  <div class="page">
    <div class="page-header">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>08</span>
    </div>

    <h1 class="section-title">06 Visual language</h1>
    <p class="lead-text">
      The visual system should feel civic, human and digitally confident. Use a small set of repeatable elements so that the brand remains recognisable across product screens, presentations and campaign graphics.
    </p>

    <h2 class="subsection-title">Graphic direction</h2>
    <ul class="styled-list">
      <li>Use clean geometric shapes, rounded corners and generous whitespace.</li>
      <li>Use subtle arcs, connected lines and pathways to suggest neighbourhoods, participation and progress.</li>
      <li>Keep illustrations simple, purposeful and consistent in stroke weight.</li>
      <li>Use gradients sparingly, mainly for brand moments and decorative accents.</li>
      <li>Use icons that are instantly understandable and avoid unnecessary detail.</li>
    </ul>

    <h2 class="subsection-title">Photography direction</h2>
    <p class="body-text">
      Choose authentic photographs of Indian neighbourhoods, streets, public spaces and community life. Prefer natural light, documentary-style framing and real civic contexts. Images should show the issue clearly without sensationalising people or communities.
    </p>

    <h2 class="subsection-title">Illustration direction</h2>
    <p class="body-text">
      Use simple, friendly illustrations to explain reporting steps, issue categories and platform workflows. Keep people inclusive and respectful; avoid caricatures or imagery that implies blame before facts are verified.
    </p>

    <h2 class="subsection-title" style="margin-top: 3.5mm;">Suggested recurring graphic motifs</h2>
    <div class="grid-2col">
      <div class="grid-card">
        <div class="grid-card-title">Connected paths</div>
        <div class="grid-card-desc">Represent reporting, visibility and follow-up.</div>
      </div>
      <div class="grid-card">
        <div class="grid-card-title">Neighbourhood blocks</div>
        <div class="grid-card-desc">Represent streets, districts and shared places.</div>
      </div>
      <div class="grid-card">
        <div class="grid-card-title">Community circles</div>
        <div class="grid-card-desc">Represent people, participation and collective voice.</div>
      </div>
      <div class="grid-card">
        <div class="grid-card-title">Signal highlights</div>
        <div class="grid-card-desc">Represent important information and public attention.</div>
      </div>
    </div>

    <div class="page-footer">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>08</span>
    </div>
  </div>

  <!-- ==================== PAGE 9: BRAND VOICE AND MESSAGING ==================== -->
  <div class="page">
    <div class="page-header">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>09</span>
    </div>

    <h1 class="section-title">07 Brand voice and messaging</h1>
    <p class="lead-text">
      NagarMitra speaks like a helpful civic companion: calm, clear, respectful and action-oriented. Communication should be accessible to people with different levels of digital confidence.
    </p>

    <h2 class="subsection-title">Voice principles</h2>
    <ul class="styled-list">
      <li><strong>Clear:</strong> Use short sentences and everyday words.</li>
      <li><strong>Respectful:</strong> Treat reporters, residents and public workers fairly.</li>
      <li><strong>Factual:</strong> Separate confirmed civic evidence from unverified claims and automated system triage.</li>
      <li><strong>Helpful:</strong> Explain what happens next without making promises the platform cannot guarantee.</li>
      <li><strong>Inclusive:</strong> Avoid jargon and make instructions easy to follow.</li>
    </ul>

    <h2 class="subsection-title" style="margin-top: 3mm;">Example product messages</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 32%;">Situation</th>
          <th>Recommended wording</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Report submitted</strong></td>
          <td>Your report has been submitted to NagarMitra. You can view its details and follow updates on the issue page.</td>
        </tr>
        <tr>
          <td><strong>Municipal triage summary</strong></td>
          <td>Here is the structured municipal triage for your report. Please review the details before submitting to municipal ward officers.</td>
        </tr>
        <tr>
          <td><strong>Location unavailable</strong></td>
          <td>We couldn't access your location. You can choose your city and add the area manually.</td>
        </tr>
        <tr>
          <td><strong>Status not verified</strong></td>
          <td>This report is visible on NagarMitra. Its status has not yet been independently confirmed.</td>
        </tr>
      </tbody>
    </table>

    <h2 class="subsection-title">Messaging guardrails</h2>
    <p class="body-text">
      Do not claim that a government department has received, accepted, acted on or resolved a report unless there is reliable evidence. Do not expose reporter contact details in public posts. Treat automated classifications and triage scores as operational baselines that are verified by field officials and municipal administrators.
    </p>

    <div class="page-footer">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>09</span>
    </div>
  </div>

  <!-- ==================== PAGE 10: BRAND APPLICATIONS ==================== -->
  <div class="page">
    <div class="page-header">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>10</span>
    </div>

    <h1 class="section-title">08 Brand applications</h1>
    <p class="lead-text">
      Apply the same identity consistently across the NagarMitra platform and public communication.
    </p>

    <h2 class="subsection-title">Digital touchpoints</h2>
    <ul class="styled-list">
      <li><strong>Website:</strong> horizontal logo in the navigation; standalone icon for favicon.</li>
      <li><strong>Reporting interface:</strong> indigo primary actions, clear typography and accessible contrast.</li>
      <li><strong>Issue cards:</strong> neutral surfaces, consistent category icons and clear status labels.</li>
      <li><strong>Social channels:</strong> standalone icon for profile images; approved templates for posts and stories.</li>
      <li><strong>Presentations:</strong> logo on cover and closing slides; use the palette and typography consistently.</li>
    </ul>

    <h2 class="subsection-title">Social media content pillars</h2>
    <ol style="margin: 2mm 0 3.5mm 0; padding-left: 5mm; font-size: 8.5pt; line-height: 1.5; color: #475569;">
      <li>Civic awareness and educational explainers.</li>
      <li>Community-reported issues and local context.</li>
      <li>Platform updates and how-to guides.</li>
      <li>Public data, trends and city-level insights.</li>
      <li>Community participation and responsible calls to action.</li>
    </ol>

    <h2 class="subsection-title">Responsible representation</h2>
    <p class="body-text">
      Protect reporter identity and personal information. Obtain appropriate permission before publishing identifiable people or sensitive evidence. Moderate allegations and remove unnecessary personal data. Clearly distinguish community submissions, platform review and official acknowledgement.
    </p>

    <h2 class="subsection-title" style="margin-top: 2.5mm;">Asset checklist for final production</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Asset</th>
          <th>Required production format</th>
          <th>Status in this release</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Primary / dark / monochrome logo</strong></td>
          <td>SVG, PDF, transparent PNG</td>
          <td>Production vector masters ready</td>
        </tr>
        <tr>
          <td><strong>Standalone social icon</strong></td>
          <td>SVG, 1024px PNG</td>
          <td>Production asset bundled</td>
        </tr>
        <tr>
          <td><strong>Colour and type specifications</strong></td>
          <td>PDF / CSS tokens</td>
          <td>Tailwind tokens implemented</td>
        </tr>
        <tr>
          <td><strong>Social templates & presentation</strong></td>
          <td>Editable source files</td>
          <td>Templates documented</td>
        </tr>
        <tr>
          <td><strong>Final vector master & brand guideline</strong></td>
          <td>AI / SVG / PDF</td>
          <td>Approved release</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 4.5mm; font-size: 7.5pt; color: #94a3b8; line-height: 1.45;">
      <strong>Document note:</strong> This Brand Kit is the production-ready identity specification (Version 2.0 • November 2026). All guidelines, typography tokens, color palettes and messaging principles reflect the live NagarMitra municipal civic platform.
    </div>

    <div style="margin-top: 5mm; font-family: 'Manrope', sans-serif; font-size: 11pt; font-weight: 800; color: #4338ca;">
      NagarMitra • Your City. Your Voice. Our Responsibility.
    </div>

    <div class="page-footer">
      <span>NAGAR MITRA / BRAND GUIDELINES</span>
      <span>10</span>
    </div>
  </div>

</body>
</html>
"""

html_file = r"D:\CityFix\brand-kit.html"
with open(html_file, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Generated {html_file}")
