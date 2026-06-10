import { useRouter } from 'expo-router';
import { TabKey } from '../components/ui/BottomTabBar';
import { useCaneStatus } from '../context/CaneStatusContext';

export function useTabNavigation(activeTab?: TabKey) {
  const router = useRouter();
  const { openStatus, closeStatus, isStatusOpen } = useCaneStatus();

  return (key: TabKey) => {
    if (key === 'status') {
      openStatus(activeTab ?? 'home');
      return;
    }

    if (isStatusOpen) closeStatus();

    if (key === activeTab) {
      if (key === 'home') router.replace('/home');
      return;
    }

    if (key === 'home') {
      router.replace('/home');
    } else if (key === 'messages') {
      router.push('/messages');
    } else if (key === 'profile') {
      router.push('/profile');
    }
  };
}
