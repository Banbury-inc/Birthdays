# frozen_string_literal: true

# App Store Connect now requires `platform` on the `apps` resource for POST /v1/apps.
# spaceship's ConnectAPI::Tunes::API#post_app (fastlane 2.235.x) omits it, which fails with:
# "You must provide a value for the attribute 'platform' with this request"
#
# Remove this patch after fastlane's post_app includes `platform` in app attributes.
# Upstream: https://github.com/fastlane/fastlane/blob/master/spaceship/lib/spaceship/connect_api/tunes/tunes.rb

module BirthdaysSpaceshipPostAppPlatformFix
  module InstanceMethods
    def post_app(name: nil, version_string: nil, sku: nil, primary_locale: nil, bundle_id: nil, platforms: nil, company_name: nil)
      platforms = [Spaceship::ConnectAPI::Platform::IOS] if platforms.nil? || platforms.empty?

      included = []
      included << {
        type: "appInfos",
        id: "${new-appInfo-id}",
        relationships: {
          appInfoLocalizations: {
            data: [
              {
                type: "appInfoLocalizations",
                id: "${new-appInfoLocalization-id}"
              }
            ]
          }
        }
      }
      included << {
        type: "appInfoLocalizations",
        id: "${new-appInfoLocalization-id}",
        attributes: {
          locale: primary_locale,
          name: name
        }
      }

      platforms.each do |platform|
        included << {
          type: "appStoreVersions",
          id: "${store-version-#{platform}}",
          attributes: {
            platform: platform,
            versionString: version_string
          },
          relationships: {
            appStoreVersionLocalizations: {
              data: [
                {
                  type: "appStoreVersionLocalizations",
                  id: "${new-#{platform}VersionLocalization-id}"
                }
              ]
            }
          }
        }

        included << {
          type: "appStoreVersionLocalizations",
          id: "${new-#{platform}VersionLocalization-id}",
          attributes: {
            locale: primary_locale
          }
        }
      end

      data_for_app_store_versions = platforms.map do |platform|
        {
          type: "appStoreVersions",
          id: "${store-version-#{platform}}"
        }
      end

      relationships = {
        appStoreVersions: {
          data: data_for_app_store_versions
        },
        appInfos: {
          data: [
            {
              type: "appInfos",
              id: "${new-appInfo-id}"
            }
          ]
        }
      }

      app_attributes = {
        sku: sku,
        primaryLocale: primary_locale,
        bundleId: bundle_id,
        platform: platforms.first
      }
      app_attributes[:companyName] = company_name if company_name

      body = {
        data: {
          type: "apps",
          attributes: app_attributes,
          relationships: relationships
        },
        included: included
      }

      tunes_request_client.post("#{Spaceship::ConnectAPI::Tunes::API::Version::V1}/apps", body)
    end
  end

  def self.apply!
    return if defined?(@@birthdays_spaceship_post_app_platform_fix_applied) && @@birthdays_spaceship_post_app_platform_fix_applied

    require "spaceship/connect_api/tunes/client"
    Spaceship::ConnectAPI::Tunes::Client.prepend(InstanceMethods)
    @@birthdays_spaceship_post_app_platform_fix_applied = true
  end
end
