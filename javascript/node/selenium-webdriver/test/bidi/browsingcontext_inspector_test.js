// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

'use strict'

const assert = require('node:assert')
const { Browser, By } = require('../../')
const { Pages, suite, ignore } = require('../../lib/test')
const BrowsingContext = require('../../bidi/browsingContext')
const BrowsingContextInspector = require('../../bidi/browsingContextInspector')
const until = require('../../lib/until')

suite(
  function (env) {
    let driver

    beforeEach(async function () {
      driver = await env.builder().build()
    })

    afterEach(async function () {
      await driver.quit()
    })

    describe('Browsing Context Inspector', function () {
      it('can listen to window browsing context created event', async function () {
        let contextInfo = null
        const browsingcontextInspector = await BrowsingContextInspector(driver)
        await browsingcontextInspector.onBrowsingContextCreated((entry) => {
          contextInfo = entry
        })

        await driver.switchTo().newWindow('window')
        const windowHandle = await driver.getWindowHandle()
        assert.equal(contextInfo.id, windowHandle)
        assert.equal(contextInfo.url, 'about:blank')
        assert.equal(contextInfo.children, null)
        assert.equal(contextInfo.parentBrowsingContext, null)
      })

      it('can listen to browsing context destroyed event', async function () {
        let contextInfo = null
        const browsingcontextInspector = await BrowsingContextInspector(driver)
        await browsingcontextInspector.onBrowsingContextDestroyed((entry) => {
          contextInfo = entry
        })

        await driver.switchTo().newWindow('window')

        const windowHandle = await driver.getWindowHandle()
        await driver.close()

        assert.equal(contextInfo.id, windowHandle)
        assert.equal(contextInfo.url, 'about:blank')
        assert.equal(contextInfo.children, null)
        assert.equal(contextInfo.parentBrowsingContext, null)
      })

      it('can listen to tab browsing context created event', async function () {
        let contextInfo = null
        const browsingcontextInspector = await BrowsingContextInspector(driver)
        await browsingcontextInspector.onBrowsingContextCreated((entry) => {
          contextInfo = entry
        })

        await driver.switchTo().newWindow('tab')
        const tabHandle = await driver.getWindowHandle()

        assert.equal(contextInfo.id, tabHandle)
        assert.equal(contextInfo.url, 'about:blank')
        assert.equal(contextInfo.children, null)
        assert.equal(contextInfo.parentBrowsingContext, null)
      })

      it('can listen to dom content loaded event', async function () {
        const browsingcontextInspector = await BrowsingContextInspector(driver)
        let navigationInfo = null
        await browsingcontextInspector.onDomContentLoaded((entry) => {
          navigationInfo = entry
        })

        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: await driver.getWindowHandle(),
        })
        await browsingContext.navigate(Pages.logEntryAdded, 'complete')

        assert.equal(navigationInfo.browsingContextId, browsingContext.id)
        assert(navigationInfo.url.includes('/bidi/logEntryAdded.html'))
      })

      it('can listen to browsing context loaded event', async function () {
        let navigationInfo = null
        const browsingcontextInspector = await BrowsingContextInspector(driver)

        await browsingcontextInspector.onBrowsingContextLoaded((entry) => {
          navigationInfo = entry
        })
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: await driver.getWindowHandle(),
        })
        await browsingContext.navigate(Pages.logEntryAdded, 'complete')

        assert.equal(navigationInfo.browsingContextId, browsingContext.id)
        assert(navigationInfo.url.includes('/bidi/logEntryAdded.html'))
      })

      ignore(env.browsers(Browser.CHROME, Browser.EDGE)).it(
        'can listen to navigation started event',
        async function () {
          let navigationInfo = null
          const browsingConextInspector = await BrowsingContextInspector(driver)

          await browsingConextInspector.onNavigationStarted((entry) => {
            navigationInfo = entry
          })

          const browsingContext = await BrowsingContext(driver, {
            browsingContextId: await driver.getWindowHandle(),
          })

          await browsingContext.navigate(Pages.logEntryAdded, 'complete')

          assert.equal(navigationInfo.browsingContextId, browsingContext.id)
          assert(navigationInfo.url.includes('/bidi/logEntryAdded.html'))
        },
      )

      it('can listen to fragment navigated event', async function () {
        let navigationInfo = null
        const browsingConextInspector = await BrowsingContextInspector(driver)

        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: await driver.getWindowHandle(),
        })
        await browsingContext.navigate(Pages.linkedImage, 'complete')

        await browsingConextInspector.onFragmentNavigated((entry) => {
          navigationInfo = entry
        })

        await browsingContext.navigate(Pages.linkedImage + '#linkToAnchorOnThisPage', 'complete')

        assert.equal(navigationInfo.browsingContextId, browsingContext.id)
        assert(navigationInfo.url.includes('linkToAnchorOnThisPage'))
      })

      xit('can listen to user prompt opened event', async function () {
        let userpromptOpened = null
        const browsingConextInspector = await BrowsingContextInspector(driver)

        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: await driver.getWindowHandle(),
        })

        await driver.get(Pages.alertsPage)

        await driver.findElement(By.id('alert')).click()

        await driver.wait(until.alertIsPresent())

        await browsingConextInspector.onUserPromptOpened((entry) => {
          userpromptOpened = entry
        })

        assert.equal(userpromptOpened.browsingContextId, browsingContext.id)
        assert.equal(userpromptOpened.type, 'alert')
      })

      xit('can listen to user prompt closed event', async function () {
        let userpromptClosed = null
        const browsingConextInspector = await BrowsingContextInspector(driver)

        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: await driver.getWindowHandle(),
        })

        await driver.get(Pages.alertsPage)

        await driver.findElement(By.id('prompt')).click()

        await driver.wait(until.alertIsPresent())

        await browsingConextInspector.onUserPromptClosed((entry) => {
          userpromptClosed = entry
        })

        await browsingContext.handleUserPrompt(true, 'selenium')

        assert.equal(userpromptClosed.browsingContextId, browsingContext.id)
        assert.equal(userpromptClosed.accepted, true)
        assert.equal(userpromptClosed.userText, 'selenium')
      })
    })
  },
  { browsers: [Browser.FIREFOX, Browser.CHROME, Browser.EDGE] },
)
