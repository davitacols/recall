import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface IconProps {
  size?: number;
  color?: string;
}

export const HomeIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="grid-outline" size={size} color={color} />
);

export const ChatIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="chatbubbles-outline" size={size} color={color} />
);

export const DecisionIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="git-compare-outline" size={size} color={color} />
);

export const KnowledgeIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="library-outline" size={size} color={color} />
);

export const SprintIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="flash-outline" size={size} color={color} />
);

export const SearchIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="search-outline" size={size} color={color} />
);

export const BellIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="notifications-outline" size={size} color={color} />
);

export const UserIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="person-outline" size={size} color={color} />
);

export const PlusIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="add" size={size} color={color} />
);

export const ArrowLeftIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="arrow-back" size={size} color={color} />
);

export const EyeIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="eye-outline" size={size} color={color} />
);

export const EyeSlashIcon = ({ size = 22, color = '#8b97aa' }: IconProps) => (
  <Ionicons name="eye-off-outline" size={size} color={color} />
);
