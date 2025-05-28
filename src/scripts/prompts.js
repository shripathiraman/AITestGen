/**
 * Collection of default prompts for different use cases
 */
export const DEFAULT_PROMPTS = {
  /**
   * Prompt for generating Playwright test code
   * Variables:
   * - ${domContent}: The DOM content to analyze
   * - ${userAction}: The user action to perform
   * - ${pageUrl}: The page URL to navigate to
   */
  PLAYWRIGHT_CODE_GENERATION: `
    Given the following DOM structure:
    \`\`\`html
    \${domContent}
    \`\`\`

    Generate Playwright test code in TypeScript to perform the following action:
    \${userAction}

    Here is the page URL:
    \${pageUrl}

    Requirements:
    1. Use only recommended Playwright locators in this priority order:
       - Always use the HTML ids or names if they exist.
       - Do not use id as locator when it has more than a single digit number as value
       - Role-based locators (getByRole)
       - Label-based locators (getByLabel)
       - Text-based locators (getByText)
       - Test ID-based locators (getByTestId)
       - Only use other locators if the above options are not applicable.

    2. Implementation guidelines:
       - Write code using TypeScript with proper type annotations
       - Include appropriate web-first assertions to validate the action
       - Use Playwright's built-in configurations and devices when applicable
       - Store frequently used locators in variables for reuse
       - Avoid hard-coded waits - rely on auto-waiting
       - Include error handling where appropriate
       - Increase the timeout to 90 seconds
       - If scenario involves navigation to a new page, do not assert on that new page's DOM

    3. Code structure:
       - Start with necessary imports
       - Include test description
       - Break down complex actions into smaller steps
       - Use meaningful variable names
       - Follow Playwright's best practices

    4. Performance and reliability:
       - Use built-in auto-waiting
       - Use assertion timeouts rather than arbitrary sleeps
       - Consider retry logic for flaky operations
       - Consider network conditions and page load states

    Respond with only the complete code block and no other text.

    Example:
    \`\`\`typescript
    import { test, expect } from '@playwright/test';
    test('descriptive test name', async ({ page }) => {
      // Implementation
    });
    \`\`\`
  `,

  /**
   * Prompt for generating Selenium Java test code ONLY
   * (No page object class at all).
   */
  SELENIUM_JAVA_TEST_ONLY: `
    Given the following DOM structure:
    \`\`\`html
    \${domContent}
    \`\`\`

    We want ONLY a Selenium Java TEST CLASS using TestNG (no page object class).
    Action to perform: \${userAction}
    URL: \${pageUrl}

    Requirements:
    1. Use recommended Selenium locator strategies in priority:
       - The elements found using locators should be either one of these tags only: input, button, select, a, div
       - By.id (only if the id doesn’t contain multiple digits like "ext-gen623")
       - By.name
       - By.linkText or partialLinkText for links
       - By.cssSelector (avoid using any attribute containing "genai")
       - By.xpath only if others aren’t suitable
    2. Implementation guidelines:
       - Java 8+ features if appropriate
       - Use TestNG for assertions
       - Use explicit waits (ExpectedConditions)
       - Add JavaDoc for methods
       - No new page object class is needed—pretend we already have it.
       - DO NOT show the PageFactory or any page class reference

    3. Code structure:
       - Show only a single test class
       - @BeforeMethod, @Test, and @AfterMethod
       - Use meaningful method names
       - Use properties file for config if you want
       - Provide only the test class code block, no other text

    Example:
    \`\`\`java
    package com.genai.tests;

    import org.openqa.selenium.WebDriver;
    import org.openqa.selenium.chrome.ChromeDriver;
    import org.openqa.selenium.support.ui.WebDriverWait;
    import org.testng.annotations.*;
    import java.time.Duration;

    public class ComponentTest {
        private WebDriver driver;
        private WebDriverWait wait;

        @BeforeMethod
        public void setUp() {
            driver = new ChromeDriver();
            wait = new WebDriverWait(driver, Duration.ofSeconds(10));
            driver.manage().window().maximize();
            driver.get("\${pageUrl}");
        }

        @Test
        public void testComponentAction() {
            // Implementation
        }

        @AfterMethod
        public void tearDown() {
            if (driver != null) {
                driver.quit();
            }
        }
    }
    \`\`\`
  `,

  /**
   * Prompt for generating Selenium Java Page class ONLY
   * (No test class).
   */
  SELENIUM_JAVA_PAGE_ONLY: `
    Given the following DOM structure:
    \`\`\`html
    \${domContent}
    \`\`\`

    We want ONLY a Selenium Java PAGE OBJECT CLASS for that DOM.
    Action to perform: \${userAction}
    URL: \${pageUrl}

    Requirements:
    1. Use recommended Selenium locator strategies in priority:
       - By.id (avoid if the id has more than a single number)
       - By.name
       - By.linkText or partialLinkText for links
       - By.xpath (use relative or following or preceding based on best case)
       - By.cssSelector (avoid "genai" attributes) only if others aren’t suitable

    2. Implementation guidelines:
       - Java 8+ features if appropriate
       - Use explicit waits (ExpectedConditions)
       - Add JavaDoc for methods & class

    3. Code structure:
       - Single page class
       - [CRITICAL] Do not generate the constructure
       - [MANDATORY] Do not add waits as my framework already has it
       - Add comments to every method that you generate
       - Provide only the code block, no other text
       - Add reportStep clearly mentioning which page the action is performed
       - Make sure the output content is adding 3 back slashes \`\`\`java\n before and after the generated code

    Example:
    \`\`\`java
    package com.leaftaps.pages;

    import com.framework.selenium.api.design.Locators;
    import com.framework.testng.api.base.ProjectSpecificMethods;

    public class LoginPage extends ProjectSpecificMethods {

      public LoginPage enterUsername(String uName) {
        clearAndType(locateElement("username"),uName);
        reportStep(uName+" username is entered successfully", "pass");
        return this;
      }

      public LoginPage enterPassword(String passWord) {
        clearAndType(locateElement("password"),passWord);
        reportStep(passWord+" password is entered successfully", "pass");
        return this;
      }

      public HomePage clickLogin() {
        click(Locators.CLASS_NAME, "decorativeSubmit");
        reportStep("Login button is clicked successfully", "pass");
        return new HomePage();
      }

    }

    \`\`\`
  `,

  /**
   * Prompt for generating Playwright Page Object class in Java ONLY
   * that uses custom wrapper methods from PlaywrightWrapper.
   */
  PLAYWRIGHT_PAGE_ONLY: `
    Given the following DOM structure:
    \`\`\`html
    \${domContent}
    \`\`\`

    Generate a Playwright Page Object class in Java that extends com.bcb.base.PlaywrightWrapper for that DOM.
    Action to perform: \${userAction}
    URL: \${pageUrl}

    Requirements:
    1. The generated class must extend com.bcb.base.PlaywrightWrapper and use its wrapper methods instead of raw Playwright calls.
    2. For each UI action, use the corresponding wrapper method:
       - For typing text, use type(String locator, String value, String name)
       - For dropdown like but not with a select tag, use clickAndChoose(String ddLocator, String optionLocator, String option, String name)
       - For selecting dropdowns with select tag, use selectByText, selectByValue, or selectByIndex as appropriate
       - For clicking, use click(String locator, String name, String elementType)
       - For mouse actions, use mouseOver(String locator, String name)
       - if a method is not available, generate a stub with a TODO comment
    3. The class structure should mirror the existing framework's pattern (as in LoginPage.java):
       - Use Cucumber step definition annotations (@Given, @When, @Then) as applicable.
       - Include methods for each action corresponding to the feature steps.
    4. Do not include any raw Playwright calls—use only the wrapper methods provided in com.bcb.base.PlaywrightWrapper.
    5. Provide only the complete Java code block and no additional text.
    6. DO NOT INCLUDE navigateTo or Verification method
    7. DO NOT INCLUDE Validation steps or methods after every action like isSelected, isClicked
    8. The locators to find the element SHOULD follow the below given instructions sequence ONLY:
       - Use ID as preferred locator (DO NOT USE ID locator when it has even single numeric digit in the value => Ex: #bb_input_2)
       - Use NAME as preferred locator (EXCEPTION: Ignore NAME locator when it has numeric digit in it or when NAME is duplicate in the DOM)
       - **For elements with text containing extra spaces, use normalize-space() in XPath**.
       - **Example:** //button[normalize-space(text())='Save'] instead of //button[text()='Save']
       - **For element with having more than a class available in an attribute, DO NOT USE CLASS in XPath**.
       - Use labeled based Following XPATH >> For Example for select: //label[text()='Select voucher type']/following::select[1]
       - NOTE: Even XPath should not use attributes that contains numbers in the value of the attribute
    Example:
    \`\`\`java
    package com.bcb.pages;

    import com.bcb.base.PlaywrightWrapper;
    import io.cucumber.java.en.Given;
    import io.cucumber.java.en.When;
    import io.cucumber.java.en.Then;

    public class LoginPage extends PlaywrightWrapper {

        @Given("I click the Home Sign In button")
        public LoginPage clickSignIn() {
            // Use the custom click method from PlaywrightWrapper
            click("//button[text()='SIGN IN']", "Sign In");
            return this;
        }

        @When("I type the username as {string}")
        public LoginPage enterUsername(String username) {
            type("//input[@name='pf.username']", username, "Username");
            return this;
        }

        @When("I type the password as {string}")
        public LoginPage enterPassword(String password) {
            type("//input[@name='pf.pass']", password, "Password");
            return this;
        }

        @Then("I click the Sign In button")
        public void clickSignInButton() {
            click("//span[text()='Sign In']", "Sign In", "Button");
        }
    }
    \`\`\`
  `,

  /**
   * Prompt for generating Cucumber Feature file
   */
  CUCUMBER_ONLY: `
    Given the following DOM structure:
    \`\`\`html
    \${domContent}
    \`\`\`

    We want a **Cucumber (Gherkin) .feature file** referencing **every relevant field** in the DOM snippet.

    **Instructions**:
    1. **Do not** include any explanations or extra text beyond the .feature content.
    2. **Identify** each relevant element (input, textarea, select, button, etc.).
    3. For each element, **create one step** referencing a placeholder (e.g. \`<fieldName>\`):
       - e.g. "When I type <companyName> into the 'Company Name' field"
       - e.g. "And I choose <state> in the 'State' dropdown"
       - e.g. "And I click the 'Create Lead' button"
    4. Use a **Scenario Outline** + **Examples** to parametrize these placeholders.
    5. **Ensure one action per step**.
    6. Output **only** valid Gherkin in a single \`\`\`gherkin code block.

    Produce **only** the .feature content as below:
    \`\`\`gherkin
    Feature: Describe your feature
      As a user of the system
      I want to \${userAction}
      So that <some reason>

      Scenario Outline: A scenario describing \${userAction}
        Given I open "\${pageUrl}"
        When I type <companyName> into the 'Company Name' field
        And I type <firstName> into the 'First Name' field
        And I type <lastName> into the 'Last Name' field
        And I type <description> into the 'Description' field
        And I type <generalCity> into the 'City' field
        And I select <state> in the 'State/Province' dropdown
        And I click the 'Create Lead' button
        Then I should see <some expected outcome>

      Examples:
        | companyName   | firstName   | lastName   | description        | generalCity | state |
        | "Acme Corp"   | "Alice"     | "Tester"   | "Some text"        | "Dallas"    | "TX"  |
        | "Mega Corp"   | "Bob"       | "Sample"   | "Other description"| "Miami"     | "FL"  |
    \`\`\`
  `
};

/**
 * Helper function to escape code blocks in prompts
 */
function escapeCodeBlocks(text) {
  return text.replace(/```/g, '\\`\\`\\`');
}

/**
 * Function to fill template variables in a prompt
 */
export function getPrompt(promptKey, variables = {}) {
  let prompt = DEFAULT_PROMPTS[promptKey];
  if (!prompt) {
    throw new Error(`Prompt not found: ${promptKey}`);
  }

  // Replace all variables in the prompt
  Object.entries(variables).forEach(([k, v]) => {
    const regex = new RegExp(`\\\${${k}}`, 'g');
    prompt = prompt.replace(regex, v);
  });

  return prompt.trim();
}

export const CODE_GENERATOR_TYPES = {
  PLAYWRIGHT_CODE_GENERATION: 'Playwright-TS-Code-Generator',
  SELENIUM_JAVA_PAGE_ONLY: 'Selenium-Java-Page-Only',
  SELENIUM_JAVA_TEST_ONLY: 'Selenium-Java-Test-Only',
  CUCUMBER_ONLY: 'Cucumber-Only',
  PLAYWRIGHT_PAGE_ONLY: 'Playwright-Page-Only'
};
