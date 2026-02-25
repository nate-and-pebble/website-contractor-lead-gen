#!/usr/bin/env node
/**
 * ZoomInfo Free Trial Exploration Script
 *
 * Step 1: Navigate to free trial signup and document the flow.
 * Run: node bin/zoominfo-explore.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const SCREENSHOTS_DIR = join(import.meta.dirname, '..', 'tmp', 'zoominfo-screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

let stepNum = 0;
async function screenshot(page, label) {
  stepNum++;
  const filename = `${String(stepNum).padStart(2, '0')}-${label}.png`;
  const path = join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 Step ${stepNum}: ${label} → ${filename}`);
  return path;
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  console.log('\n=== STEP 1: Navigate to ZoomInfo Free Trial ===\n');

  try {
    await page.goto('https://www.zoominfo.com/free-trial', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    // Give JS time to render after DOM is ready
    await page.waitForTimeout(5000);

    console.log(`Current URL: ${page.url()}`);
    console.log(`Page title: ${await page.title()}`);

    await screenshot(page, 'free-trial-landing');

    // Log all visible form fields
    const formFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs.map(el => ({
        type: el.type || el.tagName.toLowerCase(),
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        label: el.labels?.[0]?.textContent?.trim(),
        required: el.required,
        visible: el.offsetParent !== null,
      })).filter(f => f.visible);
    });

    console.log('\n--- Visible Form Fields ---');
    formFields.forEach(f => {
      console.log(`  ${f.label || f.placeholder || f.name || f.id}: type=${f.type}, required=${f.required}`);
    });

    // Log all visible buttons and links
    const buttons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a[role="button"], input[type="submit"]'));
      return btns.map(b => ({
        text: b.textContent?.trim()?.substring(0, 80),
        type: b.type || b.tagName.toLowerCase(),
        visible: b.offsetParent !== null,
      })).filter(b => b.visible && b.text);
    });

    console.log('\n--- Visible Buttons ---');
    buttons.forEach(b => {
      console.log(`  [${b.type}] ${b.text}`);
    });

    // Check if there's a cookie consent banner or popup
    const popups = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('[role="dialog"], .modal, .popup, [class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"]'));
      return modals.map(m => ({
        tag: m.tagName,
        className: m.className?.substring?.(0, 100),
        text: m.textContent?.trim()?.substring(0, 200),
        visible: m.offsetParent !== null,
      })).filter(m => m.visible);
    });

    if (popups.length) {
      console.log('\n--- Popups/Modals ---');
      popups.forEach(p => console.log(`  ${p.tag}.${p.className}: ${p.text}`));
    }

    // Now try to fill in the signup form
    console.log('\n=== STEP 2: Attempting Signup ===\n');

    // Signup details
    const signup = {
      firstName: 'Nate',
      lastName: 'Hood',
      email: 'nateihood.transactions+zi1@gmail.com',
      company: 'Brightpath Learning Solutions',
      phone: '5127894532',
      jobTitle: 'Director of Business Development',
    };

    // Try to dismiss cookie banners first
    try {
      const acceptCookie = page.locator('button:has-text("Accept"), button:has-text("Got it"), button:has-text("OK"), button:has-text("Agree")').first();
      if (await acceptCookie.isVisible({ timeout: 2000 })) {
        await acceptCookie.click();
        console.log('Dismissed cookie banner');
      }
    } catch { /* no cookie banner */ }

    // Try common field patterns - ZoomInfo forms vary
    const fieldMappings = [
      { value: signup.firstName, selectors: ['input[name="firstName"]', 'input[name="first_name"]', 'input[name="FirstName"]', 'input[placeholder*="First"]', '#firstName', '#FirstName'] },
      { value: signup.lastName, selectors: ['input[name="lastName"]', 'input[name="last_name"]', 'input[name="LastName"]', 'input[placeholder*="Last"]', '#lastName', '#LastName'] },
      { value: signup.email, selectors: ['input[name="email"]', 'input[name="Email"]', 'input[type="email"]', 'input[placeholder*="email" i]', '#email', '#Email'] },
      { value: signup.company, selectors: ['input[name="company"]', 'input[name="Company"]', 'input[placeholder*="Company" i]', '#company', '#Company'] },
      { value: signup.phone, selectors: ['input[name="phone"]', 'input[name="Phone"]', 'input[type="tel"]', 'input[placeholder*="Phone" i]', '#phone', '#Phone'] },
      { value: signup.jobTitle, selectors: ['input[name="title"]', 'input[name="Title"]', 'input[name="jobTitle"]', 'input[placeholder*="Title" i]', '#title', '#Title', '#jobTitle'] },
    ];

    for (const { value, selectors } of fieldMappings) {
      let filled = false;
      for (const sel of selectors) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 1000 })) {
            await el.fill(value);
            console.log(`✅ Filled "${value}" into ${sel}`);
            filled = true;
            break;
          }
        } catch { /* try next selector */ }
      }
      if (!filled) {
        console.log(`⚠️  Could not find field for: ${value}`);
      }
    }

    // Check for dropdowns (company size, industry, etc.)
    const selects = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name,
        id: s.id,
        options: Array.from(s.options).map(o => o.text).slice(0, 10),
        visible: s.offsetParent !== null,
      })).filter(s => s.visible);
    });

    if (selects.length) {
      console.log('\n--- Dropdown Fields ---');
      selects.forEach(s => {
        console.log(`  ${s.name || s.id}: ${s.options.join(', ')}`);
      });
    }

    await screenshot(page, 'form-filled');

    // Look for any additional required fields or checkboxes
    const checkboxes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input[type="checkbox"]')).map(c => ({
        name: c.name,
        id: c.id,
        label: c.labels?.[0]?.textContent?.trim()?.substring(0, 100),
        checked: c.checked,
        visible: c.offsetParent !== null,
      })).filter(c => c.visible);
    });

    if (checkboxes.length) {
      console.log('\n--- Checkboxes ---');
      checkboxes.forEach(c => console.log(`  [${c.checked ? 'x' : ' '}] ${c.label || c.name || c.id}`));
    }

    // Pause here to let user see before submitting
    console.log('\n=== Form filled. Waiting 5 seconds before submission attempt... ===\n');
    await page.waitForTimeout(5000);
    await screenshot(page, 'pre-submit');

    // Try to find and click the submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Start Free Trial")',
      'button:has-text("Get Started")',
      'button:has-text("Sign Up")',
      'button:has-text("Submit")',
      'button:has-text("Try Free")',
      'button:has-text("Request")',
    ];

    let submitted = false;
    for (const sel of submitSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1000 })) {
          const btnText = await btn.textContent();
          console.log(`Found submit button: "${btnText?.trim()}" (${sel})`);
          await btn.click();
          submitted = true;
          console.log('✅ Clicked submit button');
          break;
        }
      } catch { /* try next */ }
    }

    if (!submitted) {
      console.log('⚠️  Could not find submit button');
    }

    // Wait for navigation or response
    await page.waitForTimeout(5000);

    console.log(`\nPost-submit URL: ${page.url()}`);
    console.log(`Post-submit title: ${await page.title()}`);

    await screenshot(page, 'post-submit');

    // Check for error messages
    const errors = await page.evaluate(() => {
      const errorEls = Array.from(document.querySelectorAll('[class*="error" i], [class*="alert" i], [class*="invalid" i], [role="alert"]'));
      return errorEls.map(e => e.textContent?.trim()?.substring(0, 200)).filter(Boolean);
    });

    if (errors.length) {
      console.log('\n--- Error Messages ---');
      errors.forEach(e => console.log(`  ❌ ${e}`));
    }

    // Check page content for common outcomes
    const pageText = await page.evaluate(() => document.body?.innerText?.substring(0, 3000));

    if (pageText?.toLowerCase().includes('verify your email')) {
      console.log('\n🔔 EMAIL VERIFICATION REQUIRED');
    }
    if (pageText?.toLowerCase().includes('schedule') || pageText?.toLowerCase().includes('demo')) {
      console.log('\n🔔 SCHEDULE A DEMO / TALK TO SALES WALL DETECTED');
    }
    if (pageText?.toLowerCase().includes('thank you') || pageText?.toLowerCase().includes('thanks')) {
      console.log('\n🔔 THANK YOU PAGE — submission may have worked');
    }
    if (pageText?.toLowerCase().includes('phone') && pageText?.toLowerCase().includes('verification')) {
      console.log('\n🔔 PHONE VERIFICATION REQUIRED');
    }

    // Wait a bit more and take final screenshot
    await page.waitForTimeout(3000);
    await screenshot(page, 'final-state');

    console.log('\n=== Page text (first 2000 chars) ===\n');
    console.log(pageText?.substring(0, 2000));

    // Keep browser open for 30 seconds for manual inspection
    console.log('\n⏳ Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (err) {
    console.error('Error:', err.message);
    await screenshot(page, 'error-state');
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed. Screenshots saved to tmp/zoominfo-screenshots/');
  }
}

main();
