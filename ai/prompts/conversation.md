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