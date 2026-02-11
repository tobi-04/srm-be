/**
 * Test template rendering
 */
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

async function testTemplateRendering() {
  console.log('Testing Template Rendering...\n');

  // Try to find template file
  const possiblePaths = [
    path.join(__dirname, 'src', 'modules', 'email-automation', 'templates', 'reset-password.hbs'),
    path.join(__dirname, 'dist', 'modules', 'email-automation', 'templates', 'reset-password.hbs'),
  ];

  let templatePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      templatePath = p;
      console.log(`✅ Found template at: ${p}`);
      break;
    } else {
      console.log(`❌ Not found: ${p}`);
    }
  }

  if (!templatePath) {
    console.error('\n❌ Template file not found!');
    return;
  }

  // Read template
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  console.log(`\n📄 Template size: ${templateContent.length} bytes`);

  // Render template
  const compiled = Handlebars.compile(templateContent);
  const html = compiled({
    userName: 'Test User',
    resetLink: 'http://localhost:5173/reset-password?token=TEST_TOKEN_123'
  });

  console.log('\n✅ Template rendered successfully!');
  console.log(`📧 Rendered HTML size: ${html.length} bytes`);
  
  // Check if link is in the rendered HTML
  if (html.includes('http://localhost:5173/reset-password?token=TEST_TOKEN_123')) {
    console.log('✅ Reset link found in rendered HTML');
  } else {
    console.log('❌ Reset link NOT found in rendered HTML');
  }

  if (html.includes('Test User')) {
    console.log('✅ User name found in rendered HTML');
  } else {
    console.log('❌ User name NOT found in rendered HTML');
  }

  // Save to file for inspection
  const outputPath = path.join(__dirname, 'test-email-output.html');
  fs.writeFileSync(outputPath, html);
  console.log(`\n📁 Saved rendered HTML to: ${outputPath}`);
  console.log('   You can open this file in a browser to see how the email looks');
}

testTemplateRendering().catch(console.error);
