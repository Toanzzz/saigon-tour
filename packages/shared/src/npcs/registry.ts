import alex from '@saigon/npc-alex'
import alley_diner from '@saigon/npc-alley-diner'
import alley_vendor from '@saigon/npc-alley-vendor'
import ba from '@saigon/npc-ba'
import bread_vendor from '@saigon/npc-bread-vendor'
import coffee_friend from '@saigon/npc-coffee-friend'
import coffee_reader from '@saigon/npc-coffee-reader'
import commuter from '@saigon/npc-commuter'
import fruit_vendor from '@saigon/npc-fruit-vendor'
import hoa from '@saigon/npc-hoa'
import type { NpcDefinition } from '@saigon/npc-kit'
import linh from '@saigon/npc-linh'
import mai from '@saigon/npc-mai'
import market_browse from '@saigon/npc-market-browse'
import market_family from '@saigon/npc-market-family'
import market_walk from '@saigon/npc-market-walk'
import opera_visitor from '@saigon/npc-opera-visitor'
import park_reader from '@saigon/npc-park-reader'
import park_stretch from '@saigon/npc-park-stretch'
import plaza_friends from '@saigon/npc-plaza-friends'
import plaza_stroll from '@saigon/npc-plaza-stroll'
import postcard_reader from '@saigon/npc-postcard-reader'
import river_jogger from '@saigon/npc-river-jogger'
import riverside_friends from '@saigon/npc-riverside-friends'
import son from '@saigon/npc-son'
import square_tourist from '@saigon/npc-square-tourist'
import student from '@saigon/npc-student'
import tam from '@saigon/npc-tam'
import thao from '@saigon/npc-thao'
import vy from '@saigon/npc-vy'
import type { NpcId } from '../entities'

/**
 * One definition per NPC. During the migration this mixes extracted packages
 * with the data still living in shared tables; each extracted package replaces
 * its inline entry here. The `satisfies` guard fails the build if an id is
 * missing or unknown.
 */
export const NPC_REGISTRY = {
  hoa,
  tam,
  linh,
  ba,
  mai,
  alex,
  vy,
  son,
  thao,
  'bread-vendor': bread_vendor,
  'fruit-vendor': fruit_vendor,
  'market-browse': market_browse,
  'market-walk': market_walk,
  'market-family': market_family,
  'coffee-friend': coffee_friend,
  'coffee-reader': coffee_reader,
  commuter: commuter,
  student: student,
  'park-reader': park_reader,
  'park-stretch': park_stretch,
  'plaza-friends': plaza_friends,
  'plaza-stroll': plaza_stroll,
  'opera-visitor': opera_visitor,
  'postcard-reader': postcard_reader,
  'square-tourist': square_tourist,
  'riverside-friends': riverside_friends,
  'river-jogger': river_jogger,
  'alley-vendor': alley_vendor,
  'alley-diner': alley_diner,
} satisfies Partial<Record<NpcId, NpcDefinition>>

export type RegisteredId = keyof typeof NPC_REGISTRY
