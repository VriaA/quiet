import { createSelector } from 'reselect'
import { StoreKeys } from '../store.keys'
import {
  publicChannelsAdapter,
  channelMessagesAdapter,
  publicChannelsStatusAdapter,
  publicChannelsSubscriptionsAdapter
} from './publicChannels.adapter'
import { CreatedSelectors, StoreState } from '../store.types'
import { certificatesMapping } from '../users/users.selectors'
import { formatMessageDisplayDay } from '../../utils/functions/dates/formatMessageDisplayDate'
import { displayableMessage } from '../../utils/functions/dates/formatDisplayableMessage'
import { isDefined } from '@quiet/common'
import { ChannelMessage, DisplayableMessage, MessageType, MessagesDailyGroups, MessagesGroupsType, PublicChannel, PublicChannelStatus } from '@quiet/types'

const selectState: CreatedSelectors[StoreKeys.PublicChannels] = (state: StoreState) =>
  state[StoreKeys.PublicChannels]

export const selectChannels = createSelector(selectState, (state) => {
  if (!state) return []
  return publicChannelsAdapter.getSelectors().selectAll(state.channels)
})

const selectChannelsSubscriptions = createSelector(selectState, (state) => {
  if (!state) return []
  return publicChannelsSubscriptionsAdapter.getSelectors().selectAll(state.channelsSubscriptions)
})

const pendingGeneralChannelRecreation = createSelector(selectState, state => {
  return state.pendingGeneralChannelRecreation
})

export const subscribedChannels = createSelector(
  selectChannelsSubscriptions,
  (subscriptions) => {
    return subscriptions.map(subscription => {
      if (subscription.subscribed) return subscription.address
    })
  }
)

// Serves for testing purposes only
export const selectGeneralChannel = createSelector(selectChannels, channels => {
  const draft = channels.find(item => item.address === 'general')
  if (!draft) {
    console.error('No general channel')
    return
  }
  const channel: PublicChannel = {
    name: draft.name,
    description: draft.description,
    owner: draft.owner,
    timestamp: draft.timestamp,
    address: draft.address
  }
  return channel
})

export const publicChannels = createSelector(selectChannels, (selectChannelsSelector) => {
  const channels = Array.from(selectChannelsSelector)
  const sorted = channels.sort((a, b) => {
    if (a.name === 'general') {
      return -1
    }
    if (b.name === 'general') {
      return 0
    }
    return a.name.localeCompare(b.name)
  })

  return sorted
})

export const sortedChannels = createSelector(publicChannels, (channels) => {
  const sorted = channels.sort((a, b) => {
    if (a.name === 'general') {
      return -1
    }
    if (b.name === 'general') {
      return 0
    }
    return a.name.localeCompare(b.name)
  })

  return sorted
})

export const currentChannelAddress = createSelector(
  selectState,
  (state) => {
    if (!state) return ''
    return state.currentChannelAddress
  }
)

export const generalChannel = createSelector(publicChannels, publicChannelsSelector => {
  return publicChannelsSelector.find(channel => channel.name === 'general')
})

export const recentChannels = createSelector(
  publicChannels,
  generalChannel,
  (publicChannelsSelector, generalChannelSelector) => {
    const recentChannels = publicChannelsSelector
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3)
    return recentChannels.length >= 3 ? recentChannels : [generalChannelSelector]
  }
)

export const dynamicSearchedChannels = (channelInput: string) =>
  createSelector(
    publicChannels,
    recentChannels,
    (publicChannelsSelector, recentChannelsSelector) => {
      const filteredList = publicChannelsSelector.filter(channel =>
        channel.name.includes(channelInput)
      ).filter(isDefined)

      const isFilteredList = filteredList.length > 0 ? filteredList : recentChannelsSelector

      const channelList = channelInput.length === 0 ? recentChannelsSelector : isFilteredList

      return channelList
    }
  )

// Is being used in tests
export const currentChannel = createSelector(
  currentChannelAddress,
  selectChannels,
  (address, channels) => {
    if (!address) return undefined
    return channels.find(channel => channel.address === address)
  }
)

export const currentChannelName = createSelector(
  currentChannel,
  (channel) => {
    if (!channel) return ''
    return channel.name
  }
)

export const currentChannelMessages = createSelector(
  currentChannel,
  (channel) => {
    if (!channel) return []
    return channelMessagesAdapter.getSelectors().selectAll(channel.messages)
  }
)

export const sortedCurrentChannelMessages = createSelector(
  currentChannelMessages,
  messages => {
    return messages.sort((a, b) => b.createdAt - a.createdAt).reverse()
  }
)

export const currentChannelLastDisplayedMessage = createSelector(
  sortedCurrentChannelMessages,
  (messages) => {
    return messages[0]
  }
)

export const newestCurrentChannelMessage = createSelector(
  sortedCurrentChannelMessages,
  messages => {
    return messages[messages.length - 1]
  }
)

export const displayableCurrentChannelMessages = createSelector(
  sortedCurrentChannelMessages,
  certificatesMapping,
  (messages, certificates) => {
    return messages.reduce((result: DisplayableMessage[], message: ChannelMessage) => {
      const user = certificates[message.pubKey]
      if (user) {
        result.push(displayableMessage(message, user.username))
      }
      return result
    }, [])
  }
)

export const currentChannelMessagesCount = createSelector(
  displayableCurrentChannelMessages,
  (messages) => {
    return messages.length
  }
)

export const dailyGroupedCurrentChannelMessages = createSelector(
  displayableCurrentChannelMessages,
  messages => {
    const result: MessagesGroupsType = messages.reduce((groups: MessagesGroupsType, message: DisplayableMessage) => {
      const date = formatMessageDisplayDay(message.date)

      if (!groups[date]) {
        groups[date] = []
      }

      groups[date].push(message)
      return groups
    }, {})

    return result
  }
)

export const currentChannelMessagesMergedBySender = createSelector(
  dailyGroupedCurrentChannelMessages,
  groups => {
    const result: MessagesDailyGroups = {}
    for (const day in groups) {
      result[day] = groups[day].reduce((merged: DisplayableMessage[][], message: DisplayableMessage) => {
        // Get last item from collected array for comparison
        if (!merged.length) {
          merged.push([message])
          return merged
        }
        const index = merged.length && merged.length - 1
        const last = merged[index][0]

        if (last.nickname === message.nickname && message.createdAt - last.createdAt < 300 && message.type !== MessageType.Info && last.type !== MessageType.Info) {
          merged[index].push(message)
        } else {
          merged.push([message])
        }

        return merged
      }, [])
    }

    return result
  }
)

export const channelsStatus = createSelector(
  selectState,
  state => {
    if (!state?.channelsStatus) return {}
    return publicChannelsStatusAdapter
      .getSelectors()
      .selectEntities(state.channelsStatus)
  }
)

export const channelsStatusSorted = createSelector(
  selectState,
  state => {
    if (!state?.channelsStatus) return []
    const statuses = publicChannelsStatusAdapter
      .getSelectors()
      .selectAll(state.channelsStatus)

    return statuses.sort((a, b) => {
      const aCreatedAt = a.newestMessage?.createdAt
      const bCreatedAt = b.newestMessage?.createdAt
      if (!aCreatedAt && !bCreatedAt) return 0
      if (!aCreatedAt) return -1
      if (!bCreatedAt) return 1
      return aCreatedAt - bCreatedAt
    }).reverse()
  }
)

export const unreadChannels = createSelector(
  channelsStatus,
  status => {
    return Object.values(status).filter(isDefined).reduce((result: string[], channel: PublicChannelStatus) => {
      if (channel.unread) {
        result.push(channel.address)
      }
      return result
    }, [])
  }
)

export const publicChannelsSelectors = {
  publicChannels,
  subscribedChannels,
  currentChannelAddress,
  currentChannelName,
  currentChannel,
  currentChannelMessages,
  sortedCurrentChannelMessages,
  displayableCurrentChannelMessages,
  newestCurrentChannelMessage,
  currentChannelMessagesCount,
  currentChannelMessagesMergedBySender,
  currentChannelLastDisplayedMessage,
  unreadChannels,
  channelsStatus,
  channelsStatusSorted,
  dynamicSearchedChannels,
  sortedChannels,
  pendingGeneralChannelRecreation
}
