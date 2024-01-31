import { By, until } from 'selenium-webdriver'

import {
  App,
  Channel,
  ChannelContextMenu,
  CreateCommunityModal,
  JoinCommunityModal,
  RegisterUsernameModal,
  Sidebar,
  UserProfileContextMenu,
} from '../selectors'
import logger from '../logger'

const log = logger('userProfile')

interface UserTestData {
  username: string
  app: App
  messages: string[]
}

jest.setTimeout(900000)

describe('User Profile Feature', () => {
  let generalChannelOwner: Channel
  let generalChannelUser1: Channel
  let invitationCode: string

  let users: Record<string, UserTestData>
  const communityName = 'testcommunity'
  const expectedImgSrc =
    'data:image/png;base64,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'

  const sleep = async (time = 1000) => {
    await new Promise<void>(resolve =>
      setTimeout(() => {
        resolve()
      }, time)
    )
  }

  beforeAll(async () => {
    users = {
      owner: {
        username: 'owner',
        messages: ['Hi', 'Hello', 'After guest left the app'],
        app: new App(),
      },
      user1: {
        username: 'user-joining-1',
        messages: [],
        app: new App(),
      },
    }
  })

  afterAll(async () => {
    for (const user of Object.values(users)) {
      await user.app.close()
    }
  })

  beforeEach(async () => {
    await sleep(1000)
  })

  it('Owner opens the app', async () => {
    await users.owner.app.open()
  })

  it('Owner sees "join community" modal and switches to "create community" modal', async () => {
    const joinModal = new JoinCommunityModal(users.owner.app.driver)
    const isJoinModal = await joinModal.element.isDisplayed()
    expect(isJoinModal).toBeTruthy()
    await joinModal.switchToCreateCommunity()
  })

  it('Owner submits valid community name', async () => {
    const createModal = new CreateCommunityModal(users.owner.app.driver)
    const isCreateModal = await createModal.element.isDisplayed()
    expect(isCreateModal).toBeTruthy()
    await createModal.typeCommunityName(communityName)
    await createModal.submit()
  })

  it('Owner sees "register username" modal and submits valid username', async () => {
    const registerModal = new RegisterUsernameModal(users.owner.app.driver)
    const isRegisterModal = await registerModal.element.isDisplayed()
    expect(isRegisterModal).toBeTruthy()
    await registerModal.typeUsername(users.owner.username)
    await registerModal.submit()
  })

  it('Owner registers successfully and sees general channel', async () => {
    generalChannelOwner = new Channel(users.owner.app.driver, 'general')
    const isGeneralChannel = await generalChannelOwner.element.isDisplayed()
    const generalChannelText = await generalChannelOwner.element.getText()
    expect(isGeneralChannel).toBeTruthy()
    expect(generalChannelText).toEqual('# general')
  })

  it('Owner sends a message', async () => {
    const isMessageInput = await generalChannelOwner.messageInput.isDisplayed()
    expect(isMessageInput).toBeTruthy()
    await generalChannelOwner.sendMessage(users.owner.messages[0])
  })

  it('Owner updates their profile photo', async () => {
    const menu = new UserProfileContextMenu(users.owner.app.driver)
    await menu.openMenu()
    await menu.openEditProfileMenu()
    await menu.uploadPhoto()
  })

  it("Owner's message with profile photo is visible on channel", async () => {
    const messages = await generalChannelOwner.getUserMessages(users.owner.username)
    const text = await messages[1].getText()
    expect(text).toEqual(users.owner.messages[0])

    const fullMessages = await generalChannelOwner.getUserMessagesFull(users.owner.username)
    const img = await fullMessages[1].findElement(By.tagName('img'))
    const imgSrc = await img.getAttribute('src')
    expect(imgSrc).toEqual(expectedImgSrc)
  })

  it('Owner opens the settings tab and gets an invitation code', async () => {
    const settingsModal = await new Sidebar(users.owner.app.driver).openSettings()
    const isSettingsModal = await settingsModal.element.isDisplayed()
    expect(isSettingsModal).toBeTruthy()
    await sleep(2000)
    await settingsModal.switchTab('invite') // TODO: Fix - the invite tab should be default for the owner
    await sleep(2000)
    const invitationCodeElement = await settingsModal.invitationCode()
    await sleep(2000)
    invitationCode = await invitationCodeElement.getText()
    await sleep(2000)
    expect(invitationCode).not.toBeUndefined()
    log('Received invitation code:', invitationCode)
    await settingsModal.close()
  })

  it('First user opens the app', async () => {
    await users.user1.app.open()
  })

  it('First user submits invitation code received from owner', async () => {
    const joinCommunityModal = new JoinCommunityModal(users.user1.app.driver)
    const isJoinCommunityModal = await joinCommunityModal.element.isDisplayed()
    expect(isJoinCommunityModal).toBeTruthy()
    await joinCommunityModal.typeCommunityCode(invitationCode)
    await joinCommunityModal.submit()
  })

  it('First user submits valid username', async () => {
    const registerModal = new RegisterUsernameModal(users.user1.app.driver)
    const isRegisterModal = await registerModal.element.isDisplayed()
    expect(isRegisterModal).toBeTruthy()
    await registerModal.clearInput()
    await registerModal.typeUsername(users.user1.username)
    await registerModal.submit()
  })

  it('First user joins successfully sees general channel', async () => {
    generalChannelUser1 = new Channel(users.user1.app.driver, 'general')
    await generalChannelUser1.element.isDisplayed()
    const isMessageInput2 = await generalChannelUser1.messageInput.isDisplayed()
    expect(isMessageInput2).toBeTruthy()
  })

  it("First user sees owner's message with profile photo", async () => {
    const messages = await generalChannelUser1.getAtleastNumUserMessages(users.owner.username, 2)
    const elem = messages?.[1]
    if (!elem) {
      fail('Failed to find at least 2 messages')
    }
    await users.user1.app.driver.wait(until.elementIsVisible(elem))
    const text = await elem.getText()
    expect(text).toEqual(users.owner.messages[0])

    const fullMessages = await generalChannelUser1.getUserMessagesFull(users.owner.username)
    const img = await fullMessages[1].findElement(By.tagName('img'))
    await users.user1.app.driver.wait(until.elementIsVisible(img))
    const imgSrc = await img.getAttribute('src')
    expect(imgSrc).toEqual(expectedImgSrc)
  })
})