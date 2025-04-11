# Crawl prompts

OK, I'd like to focus onto an improvement to the crawling stage of this app.

To understand my request, I need you to do some research:
1. Read through another app I wrote: /Users/Chris.Weber/Tools/test-generator
2. Specifically the crawl and parsing logic found in: /Users/Chris.Weber/Tools/test-generator/lib/crawler.js and /Users/Chris.Weber/Tools/test-generator/lib/enhancedParser.js

There you will see how the crawler prepares a larger mulit-value json object after it crawls.  Each page maintains meta dta.
The goal of this enhanced process is to attempt to identify which pages are similar.

You see, Drupal sites tend to have a "tell" or hint of what kind of page it comprises.  What kind of backend data structure it represents.
You can tell by looking at the classes on the body tag.

What test-generator is doing is it treats each unique collection of body classes as a unique entry then attempts to collect all the pages it finds that are similar.
When the parsing logic runs, it only parses the unique pages and ignores the similar pages.

I wanted to explain all of this to you as an example of the kind of intelligent decision-making we can be doing to categorize pages we have paths for.

What I want to do to organize pages is a little different.

I want the ability to discover all the components used on each page.  I want to produce a components.json file that records, groups, and describes the components that are found.
I want to then use that understanding extracted into the components.json file to produce a component-library.html file that:
1. reports what html is driving the component
2. reports what css and js is used by the component.
3. outlines a file structure that would adhere to Acquia Site Studio's custom code component

The long term intent of this html document would be to drive future work in creating site studio components with the specification.

-----
# Cleanup process

Let's add a "nuke" run process that does the following:
1. Deletes the "results" folder.
2. Sets config back to default values.
3. Deletes .crawl-cache.json

-----
# Memory

Let's have the app create a "memory" folder. The create these folders in there:
1. prompts
2. issues

I'm exactly sure what I'll put into prompts.  But this would be a great place to put common prompts that would make further sense of all the compiled data.

In issues, I'm thinking about having you scan through the compiled data and try to keep track of any common problems you find.  You could create a issue.template.md file that you use as basis for create tickets like a file based jira system.

What do you think about that plan?  Think about it.  Any questions?  Any ways you think you can improve upon these two ideas?

-----
# Unit Tests

I wonder if there are parts of this app that are testable with unit tests.  I'd like to use Jest for unit testing.

I want you to think about the code in this app and create into the new insights folder for what your plan is on adding unit tests.  I'll review the document and work with you to revise the plan.

-----
# Folder / File Organization.
Let's rename the "scripts" folder to be "src"
Let's move the utils folder into src
Let's also move templates into src
Fix any import paths that need to be updated.

-----
# Template for config.json
I've added an example.config.json file into the templates folder.  Let's use that as an initial stub whenever the app is run the first time.
Keep in mind that I still want to prompt the user to enter in the domain for the site they want to crawl.  Provide a doc block warning the user to only use this on a locally running website.

-----
# Unit Tests part 2
I've reviewed your unit-testing-plan.md.  This all looks good.  My hope is that we can allow the test creation process to guide whatever code reorganizing / refectoring / extraction that is needed in order to allow the code to be:
1. more maintainable
2. easier to test
3. and have less duplicated purpose / code.

Allow test runs to provide a code coverage report, along with a report of what tests pass and fail.

----- 
# A Tool to help me create issues.
I want to give you a prompt that tells you to use the issue.template.md file to create a new issue and put it into the open folder.

The prompt should be some thing I can copy and paste, then fill out then send to the chat window with you.

----- 
# Unit Tests part 3
Great progress on the tests.  I see from /Users/Chris.Weber/Tools/crawl/tests/README.md an outline of your plan for writing tests.  There you state that we should have tests for:
* extractors
* generators
* utils
* site-crawler

Not only is this a good organization for the tests, but it also seems like a good organization for the app. Let's reorganize / rename files in the src directory to reflect this organization.

Then proceed with writing tests for the extractors.

-----
# Component parsing logic improvements
Let's add a config option for "Twig Debug Mode"
If that is set to true, then the html markup will have verbose html comments that wrap each template.  That means we have much more metadata at hand to determine whether a thing is a component or not.

Update the parsing logic to check if Twig Debug Mode is true and if so:
1. Crawl the html comments for any mention of paragraphs
2. Each paragraph html comment block will look like this (as an example):

<!-- THEME DEBUG -->
<!-- THEME HOOK: 'paragraph' -->
<!-- FILE NAME SUGGESTIONS:
   ✅ paragraph--highlight--default.html.twig
   ▪️ paragraph--highlight.html.twig
   ▪️ paragraph--default.html.twig
   ▪️ paragraph.html.twig
-->
<!-- 💡 BEGIN CUSTOM TEMPLATE OUTPUT from 'themes/custom/pncb/templates/paragraphs/paragraph--highlight--default.html.twig' -->

Let me explain the structure of this:
1. <!-- THEME DEBUG --> let's you know that Theme debug mode is on.
2. <!-- THEME HOOK: 'paragraph' --> tells you the template you're about to see is a paragraph.  There for we should consider the markup that is wrapped by this comment to be a component.
3. <!-- 💡 BEGIN CUSTOM TEMPLATE OUTPUT from 'themes/custom/pncb/templates/paragraphs/paragraph--highlight--default.html.twig' --> tells you the specific template file used for this paragraph.
4. themes/custom/pncb/templates/paragraphs/paragraph--highlight--default.html.twig uniquely identifies which component this is.
5. It might be worthwhile to consider the File Name Suggestions as all similar components:
<!-- FILE NAME SUGGESTIONS:
   ✅ paragraph--highlight--default.html.twig
   ▪️ paragraph--highlight.html.twig
   ▪️ paragraph--default.html.twig
   ▪️ paragraph.html.twig
-->

Update the component parsing with this conditional logic.

-----
Unit Tests part 4
You're making good progress.  This test writing effort is important on two levels:
1. We attempting to discover hidden bugs in the app.
2. We're using this exercise to see if the code is properly organized

While continuing writing tests for extractors:
1. Fix any bugs you find along the way.  For example the functions that don't appear to be used / misnamed.
2. Make sure the tests pass, fix the tests until they do.
3. Each time you are done with this phase, create any issues into ai/issues/open that you need.  this will help us both remember the problems that are found along the way.

---- 
# Code quality tools
I think it might be good to have some kind of tool that can scan the code tha find common code errors / syntax violations.  I think that's called a linter.  Can you add a linter or whatever tool does this.  Do we need a test that shows the linting succeeds without generating errors.

---- 
# Found a bug part 1
I found this bug:

Generating component library...
Error: TypeError: Cannot read properties of undefined (reading '0')
at /Users/Chris.Weber/Tools/crawl/src/extractors/extract-components.js:445:73
at Array.forEach (<anonymous>)
at /Users/Chris.Weber/Tools/crawl/src/extractors/extract-components.js:400:16
at Array.forEach (<anonymous>)
at Object.generateComponentLibrary (/Users/Chris.Weber/Tools/crawl/src/extractors/extract-components.js:392:13)
at crawl (/Users/Chris.Weber/Tools/crawl/src/crawler/site-crawler.js:555:49)
at async run (/Users/Chris.Weber/Tools/crawl/run.js:1006:20)

Create an appropriate issue for it.
-----
# Unit Tests part 5
Let's turn our attention to generators.
1. Write the tests first
2. Make sure the tests pass
3. Fix the tests when the test is at fault
4. Fix the code when it is at fault.
5. Remember to create issues as before whenever there are problems that take too long to fix.

Also remember that we're using this exercise to find ways of organizing the code that may be better.

-----

# Fixing Bugs Part 1
Take a quick moment to attempt to this the bugs we've gathered in /Users/Chris.Weber/Tools/crawl/ai/issues/open

For each:
1. Assess the severity and add a severity level to the issue.
2. If the issue is critical or high try to fix it.  Bug it seems to be taking a long time to fix, continue onto the next issue.
3. If any issues appear to need tests, create a new issue about what tests need to be written.
4. If any issues are fixed, "complete the issue".  Which means move the issue to the resolved folder.

-----

# Extractor tests / new approach to test plan / test writing
I notice that there still appears to be more tests needed for extractors.  Think of the plan for creating these test and produce one issue per test you have yet to write.
Then read the files you have made and think about how to improve / add more detail about those tests and improve the issue.
Then try to build out the tests according to the issues.

# Response:
You asked me

Would you like me to:
Create these issues in a specific format? Yes, see the /Users/Chris.Weber/Tools/crawl/ai/issues/issue.template.md we use.
Start implementing one of these test files? Not yet. let's loop over the test plan first.
Suggest refactoring ideas to make the extractors more testable?  That's next.  Let's get more detail as we think about the test plan.

# Context saving

Since this is the second context frame we're working in, I think it's time to extract your understanding of this app into a Context.

Do this first:
1. Read through and understand all the code in src
2. Understand the reports and results the code will produce (in results)
3. Understand the tools used to make the app and the way it's used.

Output your understanding of the app into a /Users/Chris.Weber/Tools/crawl/ai/docs/context.md file. 

Write it with the audience of a AI bot that will use this file to load it's context window with everything it needs in order to understand what we're doing here.

# Fix showstopper bug
I think we should prioritize fixing /Users/Chris.Weber/Tools/crawl/ai/issues/open/ISSUE-004-component-library-generation-error.md
This bug prevents the app from running fully.  So I think it's a high priority.

Your recent work may have fixed this bug.  I think we should check to see if it's still an issue.  If the problem persists, fix it.

Do you need to improve upon the error report before getting started.  Do you have any questions?

# Implement Suggestions
You've written out some good ideas in /Users/Chris.Weber/Tools/crawl/ai/docs/extractor-refactoring-suggestions.md
Implement all of those.  

Make sure all the tests continue to pass.

# Annoying bug
I am very annoyed with /Users/Chris.Weber/Tools/crawl/ai/issues/open/ISSUE-006-incorrect-file-path-checks.md.  It seems like a simple fix. 

Can you see to resolving this bug next?  Do you have any questions about it?

# Clean up
OK, now we have files like /Users/Chris.Weber/Tools/crawl/src/extractors/extract-animations.js AND /Users/Chris.Weber/Tools/crawl/src/extractors/extract-animations-refactored.js in the extractors folder.  
Meaning, we have the original approach and a complete refactored, additional approach.  We should keep only one solution.  Let's keep the refactored approach.

rename each -refactored file to remove the "-refactored" part of the name.  We also should keep the tests for the refactored files.  

Then make sure tests still pass.

Do you see any problems with this change?

# Unit Tests for Generators
OK, we've spent a ton of time on extractors.  Let's get started with writing tests for generators.  Like before do:

1. Read through the generators code.
2. Create issues for each test you think needs to be written.
3. review the issue you just created and think about how to improve it.
4. Implement the tests.
5. As each test is complete, complete the issue.
6. Begin again with the next test.

# Found a bug
I think I found an error with the spacing, border and animation extractors.  It reads:
Analyzing page 1/20: https://pncb.ddev.site/
Error extracting spacing: page.evaluate: ReferenceError: config is not defined
at evaluateSpacing (eval at evaluate (:234:30), <anonymous>:34:35)
at UtilityScript.evaluate (<anonymous>:236:17)
at UtilityScript.<anonymous> (<anonymous>:1:44)

Analyzing page 1/20: https://pncb.ddev.site/
Error extracting borders: page.evaluate: ReferenceError: config is not defined
at evaluateBorders (eval at evaluate (:234:30), <anonymous>:52:35)
at UtilityScript.evaluate (<anonymous>:236:17)
at UtilityScript.<anonymous> (<anonymous>:1:44)

Analyzing page 1/20: https://pncb.ddev.site/
Error extracting animations: page.evaluate: ReferenceError: config is not defined
at evaluateAnimations (eval at evaluate (:234:30), <anonymous>:53:35)
at UtilityScript.evaluate (<anonymous>:236:17)
at UtilityScript.<anonymous> (<anonymous>:1:44)

-----

# Check issues
I'm pretty sure you completed some of the issues in /Users/Chris.Weber/Tools/crawl/ai/issues/open. Can you check these issue files and see if any have been completed.  If so move them to resolved.

If not, determine which issue has the highest priority and report back to me.