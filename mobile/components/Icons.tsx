import React from 'react';
import { Svg, Path } from 'react-native-svg';

export const HomeIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChatIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8.625 12C8.625 12.4142 8.28921 12.75 7.875 12.75C7.46079 12.75 7.125 12.4142 7.125 12C7.125 11.5858 7.46079 11.25 7.875 11.25C8.28921 11.25 8.625 11.5858 8.625 12ZM12.75 12C12.75 12.4142 12.4142 12.75 12 12.75C11.5858 12.75 11.25 12.4142 11.25 12C11.25 11.5858 11.5858 11.25 12 11.25C12.4142 11.25 12.75 11.5858 12.75 12ZM16.875 12.75C17.2892 12.75 17.625 12.4142 17.625 12C17.625 11.5858 17.2892 11.25 16.875 11.25C16.4608 11.25 16.125 11.5858 16.125 12C16.125 12.4142 16.4608 12.75 16.875 12.75Z"
      fill={color}
    />
    <Path
      d="M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const DecisionIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17ZM17 21V10L12 5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const KnowledgeIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 6.042C10.3516 4.56336 8.2144 3.74694 6 4.00898V18.009C8.2144 17.747 10.3516 18.5634 12 20.042M12 6.042C13.6484 4.56336 15.7856 3.74694 18 4.00898V18.009C15.7856 17.747 13.6484 18.5634 12 20.042M12 6.042V20.042"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const SprintIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6.75 3V5.25M17.25 3V5.25M3 18.75V7.5C3 6.25736 4.00736 5.25 5.25 5.25H18.75C19.9926 5.25 21 6.25736 21 7.5V18.75M3 18.75C3 19.9926 4.00736 21 5.25 21H18.75C19.9926 21 21 19.9926 21 18.75M3 18.75V11.25C3 10.0074 4.00736 9 5.25 9H18.75C19.9926 9 21 10.0074 21 11.25V18.75"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const SearchIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const BellIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.857 17.082C16.465 16.715 17.461 15.246 17.461 13.543V11.25C17.461 9.089 16.191 7.25 14.25 6.25C13.5 4.25 11.5 3 9.25 3C7 3 5 4.25 4.25 6.25C2.309 7.25 1.039 9.089 1.039 11.25V13.543C1.039 15.246 2.035 16.715 3.643 17.082M14.857 17.082C14.857 18.25 13.918 19.25 12.75 19.25H5.75C4.582 19.25 3.643 18.25 3.643 17.082M14.857 17.082H3.643"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const UserIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.75 6C15.75 8.07107 14.0711 9.75 12 9.75C9.92893 9.75 8.25 8.07107 8.25 6C8.25 3.92893 9.92893 2.25 12 2.25C14.0711 2.25 15.75 3.92893 15.75 6ZM4.501 20.118C4.81851 16.7103 7.52154 14 10.9289 14H13.0711C16.4785 14 19.1815 16.7103 19.499 20.118C19.4999 20.1327 19.5 20.1473 19.5 20.1622C19.5 21.1824 18.6824 22 17.6622 22H6.33778C5.31762 22 4.5 21.1824 4.5 20.1622C4.5 20.1473 4.50013 20.1327 4.501 20.118Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PlusIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 4.5V19.5M19.5 12H4.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ArrowLeftIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19.5 12H4.5M4.5 12L11.25 5.25M4.5 12L11.25 18.75"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const EyeIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2.036 12.322C1.68 12.1146 1.68 11.8854 2.036 11.678C3.423 10.81 7.36 8.5 12 8.5C16.64 8.5 20.577 10.81 21.964 11.678C22.32 11.8854 22.32 12.1146 21.964 12.322C20.577 13.19 16.64 15.5 12 15.5C7.36 15.5 3.423 13.19 2.036 12.322Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const EyeSlashIcon = ({ size = 24, color = '#6b7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3.98 8.223C2.34 9.542 1.5 11.222 1.5 12C1.5 12.778 2.34 14.458 3.98 15.777M3.98 8.223L20.02 15.777M3.98 8.223C5.62 6.904 8.27 5.5 12 5.5C15.73 5.5 18.38 6.904 20.02 8.223M20.02 15.777C18.38 17.096 15.73 18.5 12 18.5C8.27 18.5 5.62 17.096 3.98 15.777M20.02 15.777L3.98 8.223M9.879 10.879C9.339 11.419 9 12.169 9 13C9 14.657 10.343 16 12 16C12.831 16 13.581 15.661 14.121 15.121M9.879 10.879L14.121 15.121M9.879 10.879L3.98 8.223M14.121 15.121L20.02 15.777"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);