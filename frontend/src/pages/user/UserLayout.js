import React from 'react'
import { Outlet } from 'react-router-dom';
import UserFooter from '../../components/UserFooter';
import UserNavigation from '../../components/UserNavigation';


function UserLayout() {
  return (
    <>
      <UserNavigation />
      <main className="min-h-[calc(100vh-60px)]">
        <Outlet />
      </main>
      <UserFooter />
    </>
  )
}

export default UserLayout