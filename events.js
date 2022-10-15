
var events = {
	// ####### INTERNAL ############################################

	// socket service events
	'SOCKET_EMIT':                         'Internal/Socket/emit',
	'SOCKET_EMIT_MULTIPLE':                'Internal/Socket/emitMultiple',

	// Connection events
	'RECONNECT':                           'Internal/Connection/reconnect',
	'SOCKET_DISCONNECTED':                 'Internal/socket/disconnected',
	'SOCKET_CONNECTED':                    'Internal/socket/connected',
	'SOCKET_RECONNECTED_ATTEMPT':          'Internal/socket/reconnect_attempt',
	'SOCKET_RECONNECTING':                 'Internal/socket/reconnecting',
	'SOCKET_RECONNECT_ERROR':              'Internal/socket/reconnect_error',
	'SOCKET_RECONNECT_FAILED':             'Internal/socket/reconnect_failed',
	'SOCKET_ERROR':                        'Internal/socket/error',

	// audio events
	'AUDIO_PLAY_SFX':                      'Internal/audio/play/sfx',

	// Map events
	'MAP_SELECT_VILLAGE':                  'Internal/Map/selectVillage',
	'MAP_SELECTED_VILLAGE':                'Internal/Map/selectedVillage',
	'MAP_ZOOM':                            'Internal/Map/zoom',
	'MAP_ZOOM_INTO_VILLAGE':               'Internal/Map/zoomIntoVillage',
	'MAP_ZOOM_OUT_OF_VILLAGE':             'Internal/Map/zoomOutOfVillage',
	'MAP_ZOOM_STEP_CHANGED':               'Internal/Map/zoomStepChanged',
	'MAP_VILLAGE_VIEW':                    'Internal/Map/villageView',
	'MAP_JUMP_TO':                         'Internal/Map/jumpTo',
	'MAP_LOADING_ASSETS':                  'Internal/Map/loadingAssets',
	'MAP_INITIALIZED':                     'Internal/Map/initialized',
	'MAP_CENTER_VILLAGE':                  'Internal/Map/centerPlayerVillage',
	'MAP_INITIALIZE':                      'Internal/Map/initialize',
	'MAP_ALREADY_INITIALIZED':             'Internal/Map/alreadyInitialized',
	'MAP_MOVEMENT_SELECTED':               'Internal/Map/movementSelected',
	'MAP_MOVEMENT_UPDATE':                 'Internal/Map/movementUpdate',

	// Village events
	'VILLAGE_SELECT_BUILDING':             'Internal/Village/selectedBuilding',
	'VILLAGE_LOADED':                      'Internal/Village/loaded',
	'VILLAGE_SWITCH':                      'Internal/Village/switch',
	'VILLAGE_LOST':                        'Internal/Village/lost',
	'VILLAGE_CONQUERED':                   'Internal/Village/conquered',

	// Groups events
	'GROUPS_VILLAGES_CHANGED':             'Internal/Groups/villagesChanged',

	// Recruiting events
	'RECRUIT_JOB_ADDED':                   'Internal/Recruit/jobAdded',
	'RECRUIT_JOB_REMOVED':                 'Internal/Recruit/jobRemoved',

	// Notification
	'NOTIFICATION_NEW':						'Notification/new',
	'NOTIFICATION_DISABLE':					'Internal/Notification/disable',
	'NOTIFICATION_ENABLE':					'Internal/Notification/enable',

	// Icon animations
	'ICON_ANIMATION_NEW':                  'Internal/IconAnimationNew',

	// Player
	'PLAYER_PASSWORDRESET_INITIATED':      'Player/passwordResetInitiated',

	// unsorted
	'RESOURCES':                           'Internal/resources',

	// tooltip
	'TOOLTIP_SHOW':                        'Internal/Tooltip/show',
	'TOOLTIP_HIDE':                        'Internal/Tooltip/hide',

	// select
	'SELECT_SHOW':                        'Internal/Select/show',
	'SELECT_HIDE':                        'Internal/Select/hide',
	'SELECT_SELECTED':                    'Internal/Select/selected',

	// report
	'REPORT_SHOW':                         'Internal/Report/show',

	// game settings
	'GAME_SETTINGS_CHANGED':               'Internal/Game/settingsChanged',

	// context menu
	'UPDATE_CONTEXT_MENU':                 'Internal/ContextMenuUpdate',

	// Client based tracking events
	'TRACKING_LANDING_PAGE':               'Internal/Tracking/landingPage',
	'TRACKING_REGISTRATION_SUCCESS':       'Internal/Tracking/registrationSuccess',
	'TRACKING_INGAME':                     'Internal/Tracking/ingame',
	'TRACKING_EMAIL_VALIDATE':             'Internal/Tracking/emailValidate',

	'TRIBE_TAB_SELECTED':                  'Internal/Tribe/tabSelected',
	'TRIBE_TAB_SET':                       'Internal/Tribe/tabSet',
	'TRIBE_TAB_DISCARD_CHANGED_SETTINGS':  'Internal/Tribe/tabDiscardChangedSettings',
	'TRIBE_TAB_DISCARD_CHANGED_PROFILE':   'Internal/Tribe/tabDiscardChangedProfile',

	// ####### SOCKET ################################################
	//
	// Received tracking snippet events.
	'TRACKING_SNIPPET_LANDING_IG':           'TrackingSnippet/landingInno',
	'TRACKING_SNIPPET_LANDING_PARTNER':      'TrackingSnippet/landingPartner',
	'TRACKING_SNIPPET_INGAME':               'TrackingSnippet/ingame',
	'TRACKING_SNIPPET_REGISTER':             'TrackingSnippet/register',
	'TRACKING_SNIPPET_VALID':                'TrackingSnippet/valid',
	// There is also a tracking event triggered by our back-end w/o client request.
	'TRACKING_SNIPPET_EVENT':                'Tracking/event',


	// Registration events
	'REGISTER_SUCCESS':                    'Register/success',

	// Maintenance
	'MAINTENANCE_BEGIN':                   'System/maintenance',
	'MAINTENANCE_END':                     'System/maintenanceEnd',

	// Authentication events
	'LOGIN_SUCCESS':                       'Login/success',
	'LOGIN_ERROR':                         'Login/error',
	'LOGOUT_SUCCESS':                       'Logout/success',
	'RECONNECTED':                         'Authentication/reconnected',
	'CHARACTER_SELECTED':                  'Authentication/characterSelected',
	'CHARACTER_CREATED':                   'Authentication/characterCreated',
	'CHARACTER_PROFILE':                   'Character/profile',
	'CHARACTER_PROFILE_SET':               'Character/profileSet',
	'CHARACTER_VILLAGE_CREATED':           'Character/villageCreated',
	'CHARACTER_INFO':                      'Character/info',
	'CHARACTER_GAME_OVER':                 'Character/gameOver',

	// Village events
	'VILLAGE':                             'Village/village',
	'VILLAGE_EFFECT':                      'Village/effect',
	'VILLAGE_WALL_INFO':                   'Village/wallInfo',
	'VILLAGE_ARMY_CHANGED':                'Village/armyChanged',
	'VILLAGE_UNITSCREEN_INFO':             'UnitScreen/data',

	// Building events
	'BUILDING_LEVEL_CHANGED':              'Building/levelChanged',
	'BUILDING_QUEUE':                      'Building/queue',
	'BUILDING_CHAPEL_DESTROYED':           'Building/chapelDestroyed',
	'BUILD_JOB_CANCELLED':                 'Building/jobCancelled',

	'MESSAGE_WELCOME':                     'System/welcome',
	'MESSAGE_SUCCESS':                     'Message/success',
	'MESSAGE_ERROR':                       'Message/error',
	'MESSAGE_DEBUG':                       'Message/debug',
	'MESSAGE_PARTY':                       'Message/party',

	// Academy events
	'ACADEMY_INFO':                        'Academy/info',
	'ACADEMY_MINTED_COINS':                'Academy/mintedCoins',
	'ACADEMY_TRAINING_CANCELLED':          'Academy/trainingCancelled',
	'ACADEMY_TRAINING_COMPLETE':           'Academy/trainingComplete',
	'ACADEMY_TRAINING_NOBLE':              'Academy/trainingNoble',
	'ACADEMY_TRAINING':                    'Academy/training',

	// Army events
	'ARMY_PRESET_ASSIGNED':                'ArmyPreset/assigned',
	'ARMY_PRESET_DELETED':                 'ArmyPreset/deleted',
	'ARMY_PRESET_FOR_VILLAGE':             'ArmyPreset/forVillage',
	'ARMY_PRESET_LIST':                    'ArmyPreset/presetList',
	'ARMY_PRESET_SAVED':                   'ArmyPreset/saved',

	// Building events
	'BUILDING_TEARING_DOWN':               'Building/tearingDown',
	'BUILDING_UPGRADING':                  'Building/upgrading',

	// Character events
	'CHARACTER_INVITATION_ACCEPTED':       'Character/invitationAccepted',
	'CHARACTER_INVITATION_DECLINED':       'Character/invitationDeclined',
	'CHARACTER_COOP_STATUS':               'Character/coopStatus',
	'CHARACTER_INVITATION_RECEIVED':       'Character/invitationReceived',
	'CHARACTER_INVITATION_SENT':           'Character/invitationSent',
	'CHARACTER_INVITATION_WITHDRAWN':      'Character/invitationWithdrawn',
	'CHARACTER_REMOVED':                   'Character/playerRemoved',
	'CHARACTER_NOOB_PROTECTION_EXTENDED':  'Character/extendedNoobProtection',
	'CHARACTER_RESTARTED':                 'Character/restarted',
	'CHARACTER_ROLE_CHANGED':              'Character/roleChanged',
	'CHARACTER_VILLAGES':                  'Village/characterVillages',
	'GLOBAL_INFORMATION':                  'GlobalInformation/info',
	'BEGINNER_PROTECTION_LOST':            'GlobalInformation/beginnerProtectionLost',
	'MEDIA_PARTNER_CAMPAIGN':			   'MediaPartner/activeCampaigns',

	// Command events
	'COMMAND_CANCELLED':                   'Command/cancelled',
	'COMMAND_IGNORED':                     'Command/ignored',
	'COMMAND_OWN_COMMANDS':                'Command/ownCommands',
	'COMMAND_SENT':                        'Command/sent',
	'COMMAND_RETURNED':                    'Command/returned',
	'COMMAND_INCOMING':                    'Command/incoming',
	'COMMAND_WITHDRAWING_SUPPORT':         'Command/withdrawingSupport',
	'COMMAND_WITHDRAWN_SUPPORT':           'Command/supportWithdrawn',
	'COMMAND_SUPPORT_ARRIVED':             'Command/supportArrived',

	// Game data events
	'GAME_DATA_BASE_DATA':                 'GameData/baseData',
	'GAME_DATA_UNITS':                     'GameData/units',
	'GAME_DATA_BUILDINGS':                 'GameData/buildings',
	'GAME_DATA_RESEARCHES':                'GameData/research',
	'GAME_DATA_COSTS_PER_COIN':            'GameData/costsPerCoin',
	'GAME_DATA_PREMIUM_COSTS':             'GameData/premium',
	'GAME_DATA_OFFICERS':				   'GameData/officers',

	// Map events
	'MAP_DELETED_LAYER':                   'Map/deletedLayer',
	'MAP_LAYER':                           'Map/layer',
	'MAP_LAYERS':                          'Map/layers',
	'MAP_SAVED_LAYER':                     'Map/savedLayer',
	'MAP_VILLAGE_DATA':                    'Map/villageData',
	'MAP_VILLAGE_DETAILS':                 'Map/villageDetails',
	'MAP_KINGDOMS':                        'Map/kingdoms',
	'MAP_PROVINCE':                        'Map/province',
	'MAP_PROVINCE_RENAMED':                'Map/renamedProvince',
	'MAP_TUTORIAL_VILLAGE_SET':            'Map/tutorialVillageSet',
	'MAP_NEW_VILLAGE':                     'Map/newVillage',

	// Report events
	'REPORT_DELETED':                      'Report/deleted',
	'REPORT_LIST':                         'Report/list',
	'REPORT_MARKED_READ':                  'Report/markedRead',
	'REPORT_MARKED_UNREAD':                'Report/markedUnread',
	'REPORT_NEW':                          'Report/new',
	'REPORT_VIEW':                         'Report/view',
	'REPORT_TOGGLED_FAVOURITE':            'Report/toggledFavourite',
	'REPORT_SETTINGS_SAVED':               'Report/settingsSaved',
	'REPORT_MARKED_SEEN':                  'Report/markedSeen',

	// Research events
	'RESEARCH_UNLOCKED':                   'Research/unlocked',
	'RESEARCH_RESEARCHED':                 'Internal/research/researched',

	// Scouting events
	'SCOUTING_CANCELLED':                  'Scouting/cancelled',
	'SCOUTING_COUNTER_MEASURE_SET':        'Scouting/counterMeasureSet',
	'SCOUTING_INFO':                       'Scouting/info',
	'SCOUTING_RECRUITING_CANCELED':        'Scouting/recruitingCanceled',
	'SCOUTING_RECRUITING_STARTED':         'Scouting/recruitingStarted',
	'SCOUTING_SENT':                       'Scouting/sent',
	'SCOUTING_SPY_PRODUCED':               'Scouting/spyProduced',

	// System events
	'SYSTEM_NIGHT_MODE':                   'System/nightMode',

	// Timline events
	'TIMELINE_TOGGLE':                     'Internal/Timeline/toggle',
	'TIMELINE_RECRUITING_PREVIEW':         'Internal/Timeline/recruitingPreview',
	'TIMELINE_EVENT_DETAILS':              'Timeline/eventDetails',
	'TIMELINE_NEW_EVENT':                  'Timeline/newEvent',
	'TIMELINE_EVENTS':                     'Timeline/events',
	'TIMELINE_RETURNING_COMMAND':		'Timeline/returningCommand',

	// Tribe events
	'TRIBE_CREATED':                       'Tribe/created',
	'TRIBE_DISBANDED':                     'Tribe/disbanded',
	'TRIBE_LEFT':                          'Tribe/left',
	'TRIBE_MEMBER_KICKED':                 'Tribe/memberKicked',
	'TRIBE_MEMBER_LIST':                   'Tribe/memberList',
	'TRIBE_MEMBER_RIGHTS_SET':             'Tribe/memberRightsSet',
	'TRIBE_MEMBER_TITLE_SET':              'Tribe/memberTitleSet',
	'TRIBE_MEMBER_TRUSTED_SET':            'Tribe/memberTrusted',
	'TRIBE_PRESETS_INDEX':                 'Tribe/rightPresets',
	'TRIBE_PROFILE':                       'Tribe/profile',
	'TRIBE_PROFILE_CHANGED':               'Tribe/profileChanged',
	'TRIBE_ALLOWS_APPLICATIONS':           'Tribe/allowsApplications',
	'TRIBE_APPLICATION_TEMPLATE_CHANGED':  'Tribe/changeApplicationTemplate',
	'TRIBE_FOUNDER_UPDATED':               'Tribe/founderPassed',
	'TRIBE_JOINED':                        'Tribe/joined',

	'TRIBE_APPLICATION_ACCEPTED':          'TribeApplication/accepted',
	'TRIBE_APPLICATION_CREATED':           'TribeApplication/created',
	'TRIBE_APPLICATION_REJECTED':          'TribeApplication/rejected',
	'TRIBE_APPLICATION_ABORTED':         'TribeApplication/aborted',
	'TRIBE_APPLICATION_INDEX':             'TribeApplication/tribeApplications',
	'TRIBE_APPLICATION_OWN':               'TribeApplication/ownApplications',

	'TRIBE_INVITATION_ACCEPTED':           'TribeInvitation/accepted',
	"TRIBE_INVITATION_REJECT":             'TribeInvitation/rejected',
	'TRIBE_INVITATION_ABORTED':            'TribeInvitation/aborted',
	'TRIBE_INVITATION_CREATED':            'TribeInvitation/created',
	'TRIBE_INVITATION_OWN':                'TribeInvitation/ownInvitations',
	'TRIBE_INVITATION_INDEX':              'TribeInvitation/tribeInvitations',

	'TRIBE_NEWS_CREATED':                  'TribeNews/created',
	'TRIBE_NEWS_DELETED':                  'TribeNews/deleted',
	'TRIBE_NEWS_PINNED':                   'TribeNews/pinned',
	'TRIBE_NEWS_LIST':                     'TribeNews/list',

	'TRIBE_RELATION_CHANGED':              'TribeRelation/changed',
	'TRIBE_RELATION_LIST':                 'TribeRelation/list',

	'TRIBE_ACHIEVEMENTS_SELECTED':         'Tribe/achievementsSelected',
	'TRIBE_ACHIEVEMENTS':                  'Achievement/tribeAchievements',
	'CHARACTER_ACHIEVEMENTS':              'Achievement/characterAchievements',
	'ACHIEVEMENTS_ALL':                    'Achievement/all',
	'ACHIEVEMENTS_ACHIEVED':               'Achievement/achieved',
	'ACHIEVEMENT_PROGRESS':                'Achievement/progress',

	// Village events
	'VILLAGE_PROVINCE_VILLAGES':           'Village/provinceVillages',
	'VILLAGE_RESOURCE_INFO':               'Village/resourceInfo',
	'VILLAGE_RESOURCES_CHANGED':           'Village/resourcesChanged',
	'VILLAGE_STORAGE_INFO':                'Village/storageInfo',
	'VILLAGE_UNIT_INFO':                   'Village/unitInfo',
	'VILLAGE_NAME_CHANGED':                'Village/nameChanged',
	'VILLAGE_OWNER_CHANGED':               'Village/changeVillageOwner',

	// Hospital
	'HOSPITAL_PATIENT_RELEASED':           'Hospital/released',
	'HOSPITAL_PATIENT_HEALED':             'Hospital/healed',

	// Widget events
	'WIDGET_WIDGETS':                      'Widget/widgets',

	// World events
	'WORLD_CONFIG':                        'WorldConfig/config',
	'WORLD_CONFIG_UPDATE':                 'WorldConfig/updateConfig',

	// Trading
	'TRADING_MERCHANT_STATUS':             'Trading/merchantStatus',
	'TRADING_OFFER_LIST':                  'Offer/list',
	'TRADING_OFFER_CREATED':               'Offer/created',
	'TRADING_OFFER_REMOVED':               'Offer/removed',
	'TRADING_OFFER_ACCEPTED':              'Offer/accepted',
	'TRADING_TRANSPORT_NEW':               'Transport/new',
	'TRADING_TRANSPORT_INDEX':             'Transport/list',
	'TRADING_TRANSPORT_ARRIVED':           'Transport/arrived',
	'TRADING_TRANSPORT_RETURNED':          'Transport/returned',
	'TRADING_TRANSPORT_CANCELED':          'Transport/canceled',
	'PREMIUM_INSTANT_TRADED':			   'Trading/instantTradeCompleted',

	// Ranking
	'RANKING_CHARACTER_LIST':				'Ranking/character',
	'RANKING_TRIBE_LIST':					'Ranking/tribe',

	// Messaging
	'MESSAGE_LIST':                        'Message/list',
	'MESSAGE_VIEW':                        'Message/view',
	'MESSAGE_SENT':                        'Message/sent',
	'MESSAGE_NEW':                         'Message/new',
	'MESSAGE_CHAR_ADDED':                  'Message/characterAdded',
	'MESSAGE_CHAR_KICKED':                 'Message/characterKicked',
	'MESSAGE_FOLDER_CHANGED':              'Message/changedFolder',
	'MESSAGE_DELETED':                     'Message/deleted',
	'MESSAGE_MARKED_READ':                 'Message/markedRead',
	'MESSAGE_MARKED_UNREAD':               'Message/unmarkedRead',

	// friendlist
	'FRIENDLIST':                          'Friendlist/list',
	'FRIEND_ADDED':                        'Friendlist/new',
	'FRIEND_REMOVED':                      'Friendlist/removed',


	// Specials
	'FORCE_MODEL_UPDATE':                  'Specials/forceModelUpdate',

	'EXCEPTION_DB':                        'Exception/DbException',
	'EXCEPTION_SYSTEM':                    'Exception/SystemException',
	'EXCEPTION_API':                       'Exception/ApiErrorException',
	'EXCEPTION_UNMET_REQUIREMENTS':        'Exception/UnmetRequirementsException',
	'PRECEPTORY_ORDER_SELECTED':           'Preceptory/orderSelected',

	'BARRACKS_RECRUIT_JOB_CANCELED':       'Barracks/recruitJobCanceled',
	'BARRACKS_RECRUIT_JOB_CREATED':        'Barracks/recruitJobCreated',

	'PRECEPTORY_RECRUIT_JOB_CREATED':      'Preceptory/recruitJobCreated',
	'PRECEPTORY_RECRUIT_JOB_CANCELED':     'Preceptory/recruitJobCanceled',

	'ACADEMY_RECRUIT_JOB_CREATED':         'Academy/recruitJobCreated',
	'ACADEMY_RECRUIT_JOB_CANCELED':        'Academy/recruitJobCanceled',

	'BARBARIAN_PRODUCTION_BOOSTED':        'Barbarian/productionBoosted',

	'STATUE_RECRUIT_JOB_CREATED':          'Statue/recruitJobCreated',
	'STATUE_RECRUIT_JOB_CANCELED':         'Statue/recruitJobCanceled',
	'PALADIN_INFO':                        'Paladin/info',
	'PALADIN_RELOCATED':                   'Paladin/relocated',
	'PALADIN_RENAMED':                     'Paladin/renamed',
	'PALADIN_ITEM_EQUIPPED':               'Paladin/itemEquipped',
	'PALADIN_UNLOCK_NEXT_ITEM':            'Paladin/itemUpgraded',
	'PALADIN_SUMMONED':                    'Paladin/summoned',
	'COMMAND_RELOCATED':                   'Command/relocated',

	'PREMIUM_SHOP_OFFERS':                 'Premium/shopOffers',
	'PREMIUM_ITEM_BOUGHT':                 'Premium/itemBought',
	'INVENTORY':                           'Premium/items',
	'INVENTORY_ITEM_CHANGED':              'Premium/itemChange',
	'INVENTORY_MARKED_SEEN':               'Premium/markedSeen',

	'UNIT_RECRUIT_JOB_FINISHED':           'Unit/recruitJobFinished',
	'PREMIUM_CHANGED':                     'Premium/currencyChange',
	'PREMIUM_PAYMENT_IFRAME_URL':          'Premium/iframeUrl',

	'AUTOCOMPLETE_CHARACTER':              'Autocomplete/characterNames',
	'AUTOCOMPLETE_TRIBE':                  'Autocomplete/tribeNames',
	'AUTOCOMPLETE_VILLAGE':                'Autocomplete/villageNames',

	'SETTINGS_ACCOUNT_INFO':                'Settings/accountInfo',
	'SETTINGS_PASSWORD_CHANGED':            'Settings/passwordChanged',
	// quests
	'QUESTS_QUEST_LINES':                   'Quest/questLines',
	'QUESTS_QUEST_LINE_STARTED':            'Quest/questLineStarted',
	'QUESTS_QUEST_PROGRESS':                'Quest/progress',
	'QUESTS_QUEST_FINISHED':                'Quest/closed',
	'QUESTS_QUEST_LINE_FINISHED':           'Internal/QuestLineFinished',
	'QUESTS_QUEST_MARKED_READ':             'Quest/markedRead',

	// forum
	'FORUM_FORUM_DELETED':                  'Forum/deleted',
	'FORUM_FORUM_CREATED':                  'Forum/created',
	'FORUM_THREAD_CREATED':                 'Forum/threadCreated',
	'FORUM_POST_CREATED':                   'Forum/postCreated',
	'FORUM_POST_DELETED':                   'Forum/postDeleted',
	'FORUM_POST_EDITED':                    'Forum/postEdited',
	'FORUM_THREAD_RENAMED':                 'Forum/threadRenamed',
	'FORUM_THREADS_MARKED_READ':            'Forum/threadsMarkedRead',
	'FORUM_THREADS_MARKED_UNREAD':          'Forum/threadsMarkedUnread',
	'FORUM_THREADS_PINNED':                 'Forum/threadsPinned',
	'FORUM_THREADS_UNPINNED':               'Forum/threadsUnpinned',
	'FORUM_THREADS_CLOSED':                 'Forum/threadsClosed',
	'FORUM_THREADS_REOPENED':               'Forum/threadsReopened',
	'FORUM_FORUM_MARKED_READ':              'Forum/forumMarkedRead',
	'FORUM_FORUM_MARKED_UNREAD':            'Forum/forumMarkedUnread',
	'FORUM_THREADS_DELETED':                'Forum/threadsDeleted',
	'FORUM_FORUM_RENAMED':                  'Forum/renamed',
	'FORUM_FORUM_ORDER_SET':                'Forum/orderSet',

	// groups
	'GROUPS_INDEX':                         'Group/groups',
	'GROUPS_CREATED':                       'Group/new',
	'GROUPS_DESTROYED':						'Group/deleted',
	'GROUPS_UPDATED':						'Group/changed',
	'GROUPS_VILLAGES':                      'Icon/villages',
	'GROUPS_VILLAGE_LINKED':                'Group/linked',
	'GROUPS_VILLAGE_UNLINKED':              'Group/unlinked',
	'GROUPS_VILLAGE_LINKED_SYSTEM':         'Icon/command',

	// closed beta
	'CLOSED_BETA_REGISTERED':               'ClosedBeta/registered',
	'CLOSED_BETA_ENTERED':                  'ClosedBeta/entered'
};

module.exports = events;