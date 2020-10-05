# Changelog

## UNRELEASED
* Add id & extraData to properties included in idea GET call with param includeUser=1
* On update user of for all sites add check if site exists, otherwise update breaks

## 0.7.5 (2020-10-05)
* Correct lat & lng parsing when uploading a polygon with geoJSON, it's lng, lat instead of more common used lat, lng

## 0.7.4 (2020-09-22)
* Define per user fields which role is allowed to see it

## 0.7.3 (2020-09-16)
* Fix turned around clientId for admin site creation

## 0.7.2 (2020-09-16)
* Integrate migration changes for generating proper database

## 0.7.1 (2020-09-16)
* Fix ideaTags constraint error on creating databases with node reset.js with certain mysql settings (k8s issue)

## 0.7.0 (2020-09-15)
* Start of using version numbers in changelog
