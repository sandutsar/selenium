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
const firefox = require('../../firefox')
const { Browser } = require('../../')
const { Pages, suite } = require('../../lib/test')
const BrowsingContext = require('../../bidi/browsingContext')
const { Locator } = require('../../bidi/browsingContext')
const { ScriptManager } = require('../../index')
const { EvaluateResultType } = require('../../bidi/evaluateResult')
const { LocalValue, ReferenceValue } = require('../../bidi/protocolValue')
const { ArgumentValue } = require('../../bidi/argumentValue')

suite(
  function (env) {
    let driver

    beforeEach(async function () {
      driver = await env.builder().setFirefoxOptions(new firefox.Options().enableBidi()).build()
    })

    afterEach(async function () {
      await driver.quit()
    })

    describe('Locate Nodes', function () {
      it('can locate nodes', async function () {
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await driver.get(Pages.xhtmlTestPage)

        const element = await browsingContext.locateNodes(Locator.css('div'))
        assert.strictEqual(element.length, 13)
      })

      it('can locate node', async function () {
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await driver.get(Pages.xhtmlTestPage)

        const element = await browsingContext.locateNode(Locator.css('div'))
        assert.strictEqual(element.type, 'node')
      })

      it('can locate node with css locator', async function () {
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await driver.get(Pages.xhtmlTestPage)

        const elements = await browsingContext.locateNodes(Locator.css('div.extraDiv, div.content'), 1)
        const element = elements[0]
        assert.strictEqual(element.type, 'node')
        assert.notEqual(element.value, undefined)
        assert.strictEqual(element.value.localName, 'div')
        assert.strictEqual(element.value.attributes.class, 'content')
        assert.notEqual(element.sharedId, undefined)
      })

      xit('can locate node with xpath locator', async function () {
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await driver.get(Pages.xhtmlTestPage)
        const elements = await browsingContext.locateNodes(Locator.xpath('/html/body/div[2]'), 1)

        const element = elements[0]
        assert.strictEqual(element.type, 'node')
        assert.notEqual(element.value, undefined)
        assert.strictEqual(element.value.localName, 'div')
        assert.strictEqual(element.value.attributes.class, 'content')
        assert.notEqual(element.sharedId, undefined)
      })

      xit('can locate node with inner test locator', async function () {
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await driver.get(Pages.xhtmlTestPage)
        const elements = await browsingContext.locateNodes(Locator.innerText('Spaced out'), 1)

        const element = elements[0]
        assert.strictEqual(element.type, 'node')
        assert.notEqual(element.value, undefined)
        assert.strictEqual(element.value.localName, 'div')
        assert.strictEqual(element.value.attributes.class, 'content')
        assert.notEqual(element.sharedId, undefined)
      })

      xit('can locate node with max node count', async function () {
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await driver.get(Pages.xhtmlTestPage)

        const elements = await browsingContext.locateNodes(Locator.css('div'), 4)
        assert.strictEqual(elements.length, 4)
      })

      it('can locate node with none ownership value', async function () {
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await driver.get(Pages.xhtmlTestPage)

        const elements = await browsingContext.locateNodes(Locator.css('div'), undefined, 'none')
        assert.strictEqual(elements.length, 13)
        assert.strictEqual(elements[0].handle, null)
      })

      it('can locate node with root ownership value', async function () {
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await driver.get(Pages.xhtmlTestPage)

        const elements = await browsingContext.locateNodes(Locator.css('div'), undefined, 'root')
        assert.strictEqual(elements.length, 13)
        assert.notEqual(elements[0].handle, null)
      })

      xit('can locate node with given start nodes', async function () {
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await driver.get(Pages.formPage)

        const script = await ScriptManager(id, driver)

        const result = await script.evaluateFunctionInBrowsingContext(
          id,
          "document.querySelectorAll('form')",
          false,
          'root',
        )

        assert.equal(result.resultType, EvaluateResultType.SUCCESS)
        assert.notEqual(result.realmId, null)
        assert.equal(result.result.type, 'nodelist')

        const value = result.result.value

        const startNodes = []

        value.forEach((node) => {
          startNodes.push(new ReferenceValue(node.handle, node.sharedId))
        })

        const elements = await browsingContext.locateNodes(
          Locator.css('input'),
          50,
          'none',
          undefined,
          undefined,
          startNodes,
        )

        assert.strictEqual(elements.length, 35)
      })

      it('can locate nodes in a given sandbox', async function () {
        const sandbox = 'sandbox'
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await browsingContext.navigate(Pages.xhtmlTestPage, 'complete')

        const elements = await browsingContext.locateNodes(Locator.css('div'), 1, undefined, sandbox)

        assert.strictEqual(elements.length, 1)

        const nodeId = elements[0].sharedId

        const script = await ScriptManager(id, driver)

        let argumentValues = []
        let mapValue = { sharedId: LocalValue.createStringValue(nodeId) }
        argumentValues.push(new ArgumentValue(LocalValue.createMapValue(mapValue)))

        const response = await script.callFunctionInBrowsingContext(
          id,
          'function(){ return arguments[0]; }',
          false,
          argumentValues,
          undefined,
          undefined,
          sandbox,
        )

        assert.equal(response.resultType, EvaluateResultType.SUCCESS)
        assert.equal(response.result.type, 'map')

        const sharedId = response.result.value.sharedId

        assert.strictEqual(sharedId.value, nodeId)
      })

      it('can find element', async function () {
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await driver.get(Pages.xhtmlTestPage)

        const element = await browsingContext.locateElement(Locator.css('p'))
        const elementText = await element.getText()
        assert.strictEqual(elementText, 'Open new window')
      })

      it('can find elements', async function () {
        const id = await driver.getWindowHandle()
        const browsingContext = await BrowsingContext(driver, {
          browsingContextId: id,
        })

        await driver.get(Pages.xhtmlTestPage)

        const elements = await browsingContext.locateElements(Locator.css('div'))
        assert.strictEqual(elements.length, 13)

        const elementText = await elements[0].getText()
        assert.strictEqual(elementText.includes('Open new window'), true)
      })
    })
  },
  { browsers: [Browser.FIREFOX] },
)
