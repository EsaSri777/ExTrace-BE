// Test template loading and compilation
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

async function testTemplateCompilation() {
    console.log('Testing welcome template compilation...');
    
    // Load the welcome template directly
    const templatesDir = path.join(__dirname, 'src/templates/email');
    const templatePath = path.join(templatesDir, 'welcome.html');
    
    console.log('Template path:', templatePath);
    console.log('Template exists:', fs.existsSync(templatePath));
    
    if (!fs.existsSync(templatePath)) {
        console.error('Welcome template not found!');
        return;
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    console.log('Template content length:', templateContent.length);
    
    // Compile the template
    const template = handlebars.compile(templateContent);
    
    // Test data
    const testData = {
        name: 'Test User',
        email: 'test@example.com',
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
        supportUrl: `${process.env.FRONTEND_URL}/support`
    };
    
    console.log('Test data:', testData);
    
    // Compile with test data
    const compiledHtml = template(testData);
    
    // Check if dashboardUrl is properly replaced
    if (compiledHtml.includes('{{dashboardUrl}}')) {
        console.error('❌ Template variables not replaced!');
        console.log('Raw template content sample:', templateContent.substring(0, 500));
    } else {
        console.log('✅ Template compiled successfully');
        
        // Extract the link from the compiled HTML
        const linkMatch = compiledHtml.match(/href="([^"]*dashboard[^"]*)"/);
        if (linkMatch) {
            console.log('Dashboard link found:', linkMatch[1]);
        } else {
            console.log('❌ No dashboard link found in compiled template');
        }
    }
}

testTemplateCompilation();