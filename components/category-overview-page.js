import Image from "next/image";
import Link from "next/link";
import { shouldUnoptimizeImage } from "@/lib/image-utils";

export function CategoryOverviewPage({ categories = [] }) {
  return (
    <section className="category-overview">
      <div className="page-title-row">
        <div>
          <h1>Categories</h1>
        </div>
      </div>
      <div className="category-overview-grid">
        {categories.map((category) => (
          <Link href={category.href} key={category.id} className="category-overview-card">
            <div className="category-overview-icon">
              {category.image ? (
                <Image src={category.image} alt="" fill sizes="54px" quality={76} unoptimized={shouldUnoptimizeImage(category.image)} />
              ) : (
                category.icon || "✦"
              )}
            </div>
            <div>
              <h2>{category.name}</h2>
              <p>{category.description || "Explore the latest arrivals and curated edits."}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
