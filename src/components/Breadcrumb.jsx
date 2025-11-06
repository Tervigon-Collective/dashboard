"use client";
import React from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
const Breadcrumb = ({ title }) => {
  return (
    <div className='d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24'>
      <h6 className='fw-semibold mb-0 d-flex align-items-center gap-2'>
        <Icon
          icon='solar:magic-stick-3-bold'
          width="20"
          height="20"
          style={{ color: '#000000' }}
        />
        Content Craft
      </h6>
      <ul className='d-flex align-items-center gap-2'>
        <li className='fw-medium'>
          <Link
            href='/'
            className='d-flex align-items-center gap-1 hover-text-primary'
          >
            <Icon
              icon='solar:home-smile-angle-outline'
              className='icon text-lg'
            />
            Content Craft
          </Link>
        </li>
        <li> - </li>
        <li className='fw-medium'>{title}</li>
      </ul>
    </div>
  );
};

export default Breadcrumb;
