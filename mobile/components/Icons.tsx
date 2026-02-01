import React from 'react';
import { Text } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
}

export const HomeIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>🏠</Text>
);

export const ChatIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>💬</Text>
);

export const DecisionIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>📋</Text>
);

export const KnowledgeIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>📚</Text>
);

export const SprintIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>🏃</Text>
);

export const SearchIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>🔍</Text>
);

export const BellIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>🔔</Text>
);

export const UserIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>👤</Text>
);

export const PlusIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>➕</Text>
);

export const ArrowLeftIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>←</Text>
);

export const EyeIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>👁</Text>
);

export const EyeSlashIcon = ({ size = 24, color = '#6b7280' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>🙈</Text>
);