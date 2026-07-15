from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from engagement.models import Interest, InteractionEvent
from intelligence.models import EntrepreneurProAccess, OpportunityAnalysis, UsageLimit
from platform_admin.models import PlatformActivityLog, ProviderSubscription
from realty.models import Development, Lot, Provider, ProviderMembership


class Command(BaseCommand):
    help = "Creates a safe, repeatable Istinar demo workspace."

    def handle(self, *args, **options):
        admin, _ = User.objects.get_or_create(
            email="admin@istinar.local",
            defaults={"username": "istinar-admin", "first_name": "مدير", "last_name": "استنار", "role": User.Role.PLATFORM_ADMIN, "is_staff": True, "is_superuser": True},
        )
        admin.set_password("DemoPass123!")
        admin.save()
        owner, _ = User.objects.get_or_create(
            email="owner@najd.local",
            defaults={"username": "najd-owner", "first_name": "سارة", "last_name": "النجدي", "role": User.Role.PROVIDER_OWNER, "phone": "0500000001"},
        )
        owner.set_password("DemoPass123!")
        owner.save()
        investor, _ = User.objects.get_or_create(
            email="investor@istinar.local",
            defaults={"username": "istinar-investor", "first_name": "أحمد", "last_name": "الرشيد", "role": User.Role.ENTREPRENEUR, "phone": "0500000002"},
        )
        investor.set_password("DemoPass123!")
        investor.save()

        provider, _ = Provider.objects.get_or_create(
            slug="najd-developments",
            defaults={
                "owner": owner,
                "name": "نجـد للتطوير العقاري",
                "provider_type": Provider.Type.DEVELOPER,
                "description": "شركة تطوير عقاري متخصصة في المجتمعات السكنية والتجارية ذات القيمة طويلة الأجل.",
                "city": "حائل",
                "contact_email": "hello@najd.local",
                "contact_phone": "920000100",
                "primary_color": "#0B695B",
                "accent_color": "#D7A53D",
                "plan": Provider.Plan.PRO,
                "status": Provider.Status.APPROVED,
                "is_featured": True,
            },
        )
        ProviderMembership.objects.get_or_create(provider=provider, user=owner, defaults={"role": ProviderMembership.Role.OWNER})
        ProviderSubscription.objects.get_or_create(
            provider=provider,
            defaults={"plan": ProviderSubscription.Plan.PRO, "status": ProviderSubscription.Status.ACTIVE, "starts_at": timezone.now(), "usage_limits": {"developments": 8, "lots": 500, "team_members": 5}},
        )

        development, _ = Development.objects.get_or_create(
            slug="najd-terraces",
            defaults={
                "provider": provider,
                "name": "تلال نجد",
                "city": "حائل",
                "district": "حي أجا",
                "address": "طريق المدينة، حائل",
                "description": "مخطط متكامل يوازن بين القطع السكنية الهادئة والواجهة التجارية على الطريق الرئيسي.",
                "development_type": Development.Type.MIXED,
                "amenities": ["حديقة مجاورة", "طريق رئيسي", "مدرسة قريبة", "خدمات تجارية"],
                "status": Development.Status.PUBLISHED,
                "visibility": Development.Visibility.PUBLIC,
                "published_at": timezone.now(),
            },
        )
        lots = [
            ("A-101", 320, 410000, "commercial", "available", True, "رئيسي", 30, [[8, 12], [24, 10], [28, 26], [10, 29]]),
            ("A-102", 285, 365000, "commercial", "reserved", False, "رئيسي", 30, [[28, 10], [44, 8], [47, 24], [29, 26]]),
            ("B-201", 420, 520000, "residential", "available", True, "داخلي", 18, [[10, 34], [28, 30], [30, 48], [12, 51]]),
            ("B-202", 380, 475000, "residential", "negotiation", False, "داخلي", 18, [[31, 30], [49, 27], [52, 46], [33, 48]]),
            ("C-301", 510, 690000, "mixed", "available", True, "واجهة تجارية", 36, [[55, 12], [78, 10], [80, 34], [57, 36]]),
            ("C-302", 295, 355000, "service", "sold", False, "واجهة تجارية", 24, [[56, 39], [75, 37], [77, 54], [58, 57]]),
        ]
        saved_lots = []
        for number, area, price, usage, lot_status, corner, frontage, width, polygon in lots:
            lot, _ = Lot.objects.get_or_create(
                development=development,
                lot_number=number,
                defaults={
                    "area": Decimal(area), "price": Decimal(price), "usage_type": usage, "status": lot_status,
                    "is_corner": corner, "frontage": frontage, "street_width": Decimal(width), "polygon": polygon,
                    "services": ["كهرباء", "مياه", "صرف صحي"],
                    "description": f"قطعة {number} ضمن مخطط تلال نجد.",
                    "metadata": {"estimated_competitors": 3 if usage != "commercial" else 5, "neighborhood_fit": 72 if usage != "residential" else 65},
                },
            )
            saved_lots.append(lot)

        Interest.objects.get_or_create(
            provider=provider, lot=saved_lots[0], email="lead@example.com",
            defaults={"full_name": "نورة الحربي", "phone": "0500001111", "message": "أرغب بمعرفة خيارات الحجز وآلية السداد.", "status": Interest.Status.NEW},
        )
        for lot in saved_lots[:3]:
            InteractionEvent.objects.get_or_create(provider=provider, development=development, lot=lot, user=investor, event_type=InteractionEvent.EventType.VIEW, defaults={"payload": {"source": "demo"}})
        UsageLimit.objects.get_or_create(user=investor, feature=UsageLimit.Feature.OPPORTUNITY_ANALYSIS, defaults={"free_limit": 2, "used_count": 0})
        PlatformActivityLog.objects.get_or_create(actor=admin, event="demo.seeded", target_type="development", target_id=str(development.id))

        self.stdout.write(self.style.SUCCESS("Demo workspace ready."))
        self.stdout.write("Admin: admin@istinar.local / DemoPass123!")
        self.stdout.write("Provider: owner@najd.local / DemoPass123!")
        self.stdout.write("Investor: investor@istinar.local / DemoPass123!")
